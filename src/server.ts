#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import * as fs from "fs"
import * as path from "path"
import { execSync } from "child_process"
import {
  findWorkspaceFiles,
  parseWorkspaceFile,
  type WorkspaceFolder,
} from "./parser.js"
import {
  getActiveWorkspace,
  setActiveWorkspace,
  clearActiveWorkspace,
  requireActiveWorkspace,
} from "./state.js"

const MAX_LINES = 2000
const MAX_LINE_LENGTH = 2000
const MAX_RESULTS = 200

const server = new McpServer(
  { name: "open-workspace", version: "0.2.0" },
  {
    instructions: [
      "Multi-root workspace support for VS Code .code-workspace files.",
      "Use workspace_list to discover workspace files, workspace_select to choose one,",
      "then workspace_parse/read/grep/glob to navigate across folders.",
    ].join(" "),
  },
)

function resolveFolder(
  folders: WorkspaceFolder[],
  folderName: string,
): WorkspaceFolder {
  const folder = folders.find(
    (f) =>
      f.name.toLowerCase() === folderName.toLowerCase() ||
      f.path === folderName,
  )
  if (!folder) {
    const available = folders.map((f) => f.name).join(", ")
    throw new Error(
      `Folder "${folderName}" not found in workspace. Available: ${available}`,
    )
  }
  if (!folder.exists) {
    throw new Error(
      `Folder "${folder.name}" does not exist on disk: ${folder.absolutePath}`,
    )
  }
  return folder
}

function getDirectory(): string {
  return process.env.WORKSPACE_DIR || process.cwd()
}

server.registerTool("workspace_list", {
  description:
    "Find all .code-workspace files in the current project directory. Returns a list of workspace files with their absolute paths.",
}, async () => {
  const dir = getDirectory()
  const files = findWorkspaceFiles(dir)

  if (files.length === 0) {
    return {
      content: [
        { type: "text", text: `No .code-workspace files found in ${dir}` },
      ],
    }
  }

  const result = files.map((f) => ({
    file: f,
    name: f.replace(/^.*\//, "").replace(/\.code-workspace$/, ""),
  }))

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  }
})

server.registerTool("workspace_select", {
  description:
    'Select a .code-workspace file as the active workspace for this session. Call without arguments to see current selection. Call with a workspace path or name to select it. Use "clear" to deselect.',
  inputSchema: {
    workspace: z
      .string()
      .optional()
      .describe(
        'Workspace file path, name (e.g. "bulb-one"), or "clear" to deselect',
      ),
  },
}, async ({ workspace }) => {
  const dir = getDirectory()
  const current = getActiveWorkspace()
  const available = findWorkspaceFiles(dir)

  if (workspace === "clear") {
    clearActiveWorkspace()
    return {
      content: [
        {
          type: "text",
          text: "Workspace deselected. You will need to specify the workspace parameter explicitly.",
        },
      ],
    }
  }

  if (!workspace) {
    const lines: string[] = []
    lines.push(
      current ? `Active workspace: ${current}` : "No workspace selected.",
    )
    lines.push("")
    lines.push(`Available workspaces in ${dir}:`)
    for (const file of available) {
      const name = file
        .replace(/^.*\//, "")
        .replace(/\.code-workspace$/, "")
      const marker = file === current ? " (active)" : ""
      lines.push(`  - ${name}${marker}: ${file}`)
    }
    if (available.length === 0) {
      lines.push("  (none found)")
    }
    return { content: [{ type: "text", text: lines.join("\n") }] }
  }

  let resolved: string | undefined

  const candidates = available.filter(
    (f) => f === workspace || f.endsWith(`/${workspace}`),
  )
  if (candidates.length === 1) {
    resolved = candidates[0]
  }

  if (!resolved) {
    const nameInput = workspace
      .replace(/\.code-workspace$/, "")
      .toLowerCase()
    const byName = available.filter((f) => {
      const fname = f
        .replace(/^.*\//, "")
        .replace(/\.code-workspace$/, "")
        .toLowerCase()
      return fname === nameInput
    })
    if (byName.length === 1) {
      resolved = byName[0]
    } else if (byName.length > 1) {
      return {
        content: [
          {
            type: "text",
            text: `Multiple workspaces match "${workspace}":\n${byName.map((f) => `  - ${f}`).join("\n")}\nPlease specify the full path.`,
          },
        ],
      }
    }
  }

  if (!resolved) {
    const names = available.map((f) =>
      f.replace(/^.*\//, "").replace(/\.code-workspace$/, ""),
    )
    return {
      content: [
        {
          type: "text",
          text: `Workspace "${workspace}" not found.\nAvailable: ${names.join(", ") || "(none)"}`,
        },
      ],
    }
  }

  const config = parseWorkspaceFile(resolved, dir)
  setActiveWorkspace(resolved)

  const folderSummary = config.folders
    .map(
      (f) =>
        `  ${f.exists ? "[ok]" : "[missing]"} ${f.name} -> ${f.absolutePath}`,
    )
    .join("\n")

  return {
    content: [
      {
        type: "text",
        text: `Selected workspace: ${resolved}\n\nFolders (${config.folders.length}):\n${folderSummary}`,
      },
    ],
  }
})

server.registerTool("workspace_parse", {
  description:
    "Parse a .code-workspace file and return all configured folders with resolved absolute paths. If no file is specified, uses the currently selected workspace.",
  inputSchema: {
    file: z
      .string()
      .optional()
      .describe(
        "Path to the .code-workspace file (optional if workspace_select was used)",
      ),
  },
}, async ({ file }) => {
  const dir = getDirectory()
  const wsFile = requireActiveWorkspace(file, dir)
  const config = parseWorkspaceFile(wsFile, dir)

  const summary = [
    `Workspace: ${config.file}`,
    `Folders (${config.folders.length}):`,
    ...config.folders.map(
      (f) =>
        `  ${f.exists ? "[ok]" : "[missing]"} ${f.name} -> ${f.absolutePath}`,
    ),
  ].join("\n")

  return {
    content: [
      { type: "text", text: JSON.stringify({ summary, ...config }, null, 2) },
    ],
  }
})

server.registerTool("workspace_read", {
  description:
    "Read a file from a specific folder within a .code-workspace multi-root workspace. Supports offset and limit for large files. Returns line-numbered content.",
  inputSchema: {
    workspace: z
      .string()
      .optional()
      .describe(
        "Path to the .code-workspace file (optional if workspace_select was used)",
      ),
    folder: z
      .string()
      .describe(
        "Folder name as defined in the workspace (e.g. 'bulb', 'ydoc')",
      ),
    file: z
      .string()
      .describe("File path relative to the folder root (e.g. 'src/index.ts')"),
    offset: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Start line (1-indexed, default 1)"),
    limit: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Max lines to read (default 2000)"),
  },
}, async ({ workspace, folder: folderName, file: filePath, offset: offsetArg, limit: limitArg }) => {
  const dir = getDirectory()
  const wsFile = requireActiveWorkspace(workspace, dir)
  const config = parseWorkspaceFile(wsFile, dir)
  const folder = resolveFolder(config.folders, folderName)
  const resolvedPath = path.resolve(folder.absolutePath, filePath)

  if (!resolvedPath.startsWith(folder.absolutePath)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Path traversal detected — file must be within the workspace folder",
        },
      ],
      isError: true,
    }
  }

  if (!fs.existsSync(resolvedPath)) {
    return {
      content: [{ type: "text", text: `Error: File not found: ${resolvedPath}` }],
      isError: true,
    }
  }

  const stat = fs.statSync(resolvedPath)
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true })
    const list = entries
      .map((e) => (e.isDirectory() ? e.name + "/" : e.name))
      .sort()
    return {
      content: [
        {
          type: "text",
          text: `Directory: ${resolvedPath}\n\n${list.join("\n")}\n\n(${list.length} entries)`,
        },
      ],
    }
  }

  const content = fs.readFileSync(resolvedPath, "utf8")
  const allLines = content.split("\n")
  const offset = offsetArg ?? 1
  const limit = limitArg ?? MAX_LINES
  const start = offset - 1
  const sliced = allLines.slice(start, start + limit)

  const numbered = sliced.map((line, i) => {
    const truncated =
      line.length > MAX_LINE_LENGTH
        ? line.slice(0, MAX_LINE_LENGTH) + "..."
        : line
    return `${start + i + 1}: ${truncated}`
  })

  const hasMore = start + sliced.length < allLines.length
  let output = `[${folder.name}] ${filePath}\n\n${numbered.join("\n")}`

  if (hasMore) {
    output += `\n\n(Showing lines ${offset}-${offset + sliced.length - 1} of ${allLines.length}. Use offset=${offset + sliced.length} to continue.)`
  } else {
    output += `\n\n(End of file - total ${allLines.length} lines)`
  }

  return { content: [{ type: "text", text: output }] }
})

server.registerTool("workspace_grep", {
  description:
    "Search file contents across all folders in a .code-workspace multi-root workspace. Uses grep to find pattern matches. Results are grouped by workspace folder.",
  inputSchema: {
    workspace: z
      .string()
      .optional()
      .describe(
        "Path to the .code-workspace file (optional if workspace_select was used)",
      ),
    pattern: z.string().describe("Search pattern (regex supported)"),
    include: z
      .string()
      .optional()
      .describe('File pattern filter (e.g. "*.ts", "*.{ts,tsx}")'),
    folders: z
      .string()
      .optional()
      .describe(
        "Comma-separated folder names to search (default: all folders)",
      ),
  },
}, async ({ workspace, pattern, include, folders: foldersArg }) => {
  const dir = getDirectory()
  const wsFile = requireActiveWorkspace(workspace, dir)
  const config = parseWorkspaceFile(wsFile, dir)
  let folders = config.folders.filter((f) => f.exists)

  if (foldersArg) {
    const names = foldersArg.split(",").map((n) => n.trim().toLowerCase())
    folders = folders.filter((f) => names.includes(f.name.toLowerCase()))
    if (folders.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No matching folders found. Available: ${config.folders.map((f) => f.name).join(", ")}`,
          },
        ],
        isError: true,
      }
    }
  }

  const allResults: string[] = []

  for (const folder of folders) {
    const includeFlag = include ? `--include='${include}'` : ""
    const cmd = `grep -rn ${includeFlag} --color=never -E ${JSON.stringify(pattern)} . 2>/dev/null | head -n ${MAX_RESULTS}`

    try {
      const output = execSync(cmd, {
        cwd: folder.absolutePath,
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: 30000,
      }).trim()

      if (output) {
        const lines = output.split("\n").map((line) => {
          const relativeLine = line.startsWith("./") ? line.slice(2) : line
          return `  ${relativeLine}`
        })
        allResults.push(
          `[${folder.name}] ${folder.absolutePath}`,
          ...lines,
          "",
        )
      }
    } catch {
      // grep returns exit code 1 when no matches found
    }
  }

  if (allResults.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No matches found for "${pattern}" across ${folders.length} workspace folders.`,
        },
      ],
    }
  }

  return { content: [{ type: "text", text: allResults.join("\n") }] }
})

server.registerTool("workspace_glob", {
  description:
    'Find files by name pattern across all folders in a .code-workspace multi-root workspace. Example patterns: "*.ts", "*.test.*", "package.json"',
  inputSchema: {
    workspace: z
      .string()
      .optional()
      .describe(
        "Path to the .code-workspace file (optional if workspace_select was used)",
      ),
    pattern: z
      .string()
      .describe('Glob pattern to match file names (e.g. "*.ts", "package.json")'),
    folders: z
      .string()
      .optional()
      .describe(
        "Comma-separated folder names to search (default: all folders)",
      ),
  },
}, async ({ workspace, pattern, folders: foldersArg }) => {
  const dir = getDirectory()
  const wsFile = requireActiveWorkspace(workspace, dir)
  const config = parseWorkspaceFile(wsFile, dir)
  let folders = config.folders.filter((f) => f.exists)

  if (foldersArg) {
    const names = foldersArg.split(",").map((n) => n.trim().toLowerCase())
    folders = folders.filter((f) => names.includes(f.name.toLowerCase()))
    if (folders.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No matching folders found. Available: ${config.folders.map((f) => f.name).join(", ")}`,
          },
        ],
        isError: true,
      }
    }
  }

  const allResults: string[] = []

  for (const folder of folders) {
    const cmd = `find . -name ${JSON.stringify(pattern)} -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/.next/*' 2>/dev/null | sort | head -n ${MAX_RESULTS}`

    try {
      const output = execSync(cmd, {
        cwd: folder.absolutePath,
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: 30000,
      }).trim()

      if (output) {
        const files = output.split("\n").map((f) => {
          const relative = f.startsWith("./") ? f.slice(2) : f
          return `  ${relative}`
        })
        allResults.push(
          `[${folder.name}] ${folder.absolutePath}`,
          ...files,
          "",
        )
      }
    } catch {
      // find returns exit code 1 on permission errors
    }
  }

  if (allResults.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No files matching "${pattern}" found across ${folders.length} workspace folders.`,
        },
      ],
    }
  }

  return { content: [{ type: "text", text: allResults.join("\n") }] }
})

const transport = new StdioServerTransport()
await server.connect(transport)
