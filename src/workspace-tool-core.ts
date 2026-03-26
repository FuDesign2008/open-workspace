import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"
import {
  findWorkspaceFiles,
  parseWorkspaceFile,
  type WorkspaceFolder,
} from "./parser.js"
import {
  clearActiveWorkspace,
  getActiveWorkspace,
  requireActiveWorkspace,
  setActiveWorkspace,
} from "./state.js"

export const MAX_READ_LINES = 2000
export const MAX_LINE_LENGTH = 2000
export const MAX_SEARCH_RESULTS = 200

export function resolveFolder(
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

export function workspaceList(directory: string): string {
  const files = findWorkspaceFiles(directory)

  if (files.length === 0) {
    return `No .code-workspace files found in ${directory}`
  }

  const result = files.map((f) => ({
    file: f,
    name: f.replace(/^.*\//, "").replace(/\.code-workspace$/, ""),
  }))

  return JSON.stringify(result, null, 2)
}

export function workspaceSelect(
  workspace: string | undefined,
  directory: string,
): string {
  const current = getActiveWorkspace()
  const available = findWorkspaceFiles(directory)

  if (workspace === "clear") {
    clearActiveWorkspace()
    return "Workspace deselected. You will need to specify the workspace parameter explicitly."
  }

  if (!workspace) {
    const lines: string[] = []
    lines.push(
      current ? `Active workspace: ${current}` : "No workspace selected.",
    )
    lines.push("")
    lines.push(`Available workspaces in ${directory}:`)
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
    return lines.join("\n")
  }

  let resolved: string | undefined

  const candidates = available.filter(
    (f) => f === workspace || f.endsWith(`/${workspace}`),
  )
  if (candidates.length === 1) {
    resolved = candidates[0]
  }

  if (!resolved) {
    const nameInput = workspace.replace(/\.code-workspace$/, "").toLowerCase()
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
      return `Multiple workspaces match "${workspace}":\n${byName.map((f) => `  - ${f}`).join("\n")}\nPlease specify the full path.`
    }
  }

  if (!resolved) {
    const names = available.map((f) =>
      f.replace(/^.*\//, "").replace(/\.code-workspace$/, ""),
    )
    return `Workspace "${workspace}" not found.\nAvailable: ${names.join(", ") || "(none)"}`
  }

  const config = parseWorkspaceFile(resolved, directory)
  setActiveWorkspace(resolved)

  const folderSummary = config.folders
    .map(
      (f) =>
        `  ${f.exists ? "[ok]" : "[missing]"} ${f.name} -> ${f.absolutePath}`,
    )
    .join("\n")

  return `Selected workspace: ${resolved}\n\nFolders (${config.folders.length}):\n${folderSummary}`
}

export function workspaceParse(
  file: string | undefined,
  directory: string,
): string {
  const wsFile = requireActiveWorkspace(file, directory)
  const config = parseWorkspaceFile(wsFile, directory)

  const summary = [
    `Workspace: ${config.file}`,
    `Folders (${config.folders.length}):`,
    ...config.folders.map(
      (f) =>
        `  ${f.exists ? "[ok]" : "[missing]"} ${f.name} -> ${f.absolutePath}`,
    ),
  ].join("\n")

  return JSON.stringify({ summary, ...config }, null, 2)
}

export type ToolTextResult = { text: string; isError?: boolean }

export function workspaceRead(
  params: {
    workspace?: string
    folder: string
    file: string
    offset?: number
    limit?: number
  },
  directory: string,
): ToolTextResult {
  const wsFile = requireActiveWorkspace(params.workspace, directory)
  const config = parseWorkspaceFile(wsFile, directory)
  const folder = resolveFolder(config.folders, params.folder)
  const resolvedPath = path.resolve(folder.absolutePath, params.file)

  if (!resolvedPath.startsWith(folder.absolutePath)) {
    return {
      text: "Error: Path traversal detected — file must be within the workspace folder",
      isError: true,
    }
  }

  if (!fs.existsSync(resolvedPath)) {
    return {
      text: `Error: File not found: ${resolvedPath}`,
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
      text: `Directory: ${resolvedPath}\n\n${list.join("\n")}\n\n(${list.length} entries)`,
    }
  }

  const content = fs.readFileSync(resolvedPath, "utf8")
  const allLines = content.split("\n")
  const offset = params.offset ?? 1
  const limit = params.limit ?? MAX_READ_LINES
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
  let output = `[${folder.name}] ${params.file}\n\n${numbered.join("\n")}`

  if (hasMore) {
    output += `\n\n(Showing lines ${offset}-${offset + sliced.length - 1} of ${allLines.length}. Use offset=${offset + sliced.length} to continue.)`
  } else {
    output += `\n\n(End of file - total ${allLines.length} lines)`
  }

  return { text: output }
}

export function workspaceGrep(
  params: {
    workspace?: string
    pattern: string
    include?: string
    folders?: string
  },
  directory: string,
): ToolTextResult {
  const wsFile = requireActiveWorkspace(params.workspace, directory)
  const config = parseWorkspaceFile(wsFile, directory)
  let folders = config.folders.filter((f) => f.exists)

  if (params.folders) {
    const names = params.folders.split(",").map((n) => n.trim().toLowerCase())
    folders = folders.filter((f) => names.includes(f.name.toLowerCase()))
    if (folders.length === 0) {
      return {
        text: `No matching folders found. Available: ${config.folders.map((f) => f.name).join(", ")}`,
        isError: true,
      }
    }
  }

  const allResults: string[] = []

  for (const folder of folders) {
    const includeFlag = params.include ? `--include='${params.include}'` : ""
    const cmd = `grep -rn ${includeFlag} --color=never -E ${JSON.stringify(params.pattern)} . 2>/dev/null | head -n ${MAX_SEARCH_RESULTS}`

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
      text: `No matches found for "${params.pattern}" across ${folders.length} workspace folders.`,
    }
  }

  return { text: allResults.join("\n") }
}

export function workspaceGlob(
  params: {
    workspace?: string
    pattern: string
    folders?: string
  },
  directory: string,
): ToolTextResult {
  const wsFile = requireActiveWorkspace(params.workspace, directory)
  const config = parseWorkspaceFile(wsFile, directory)
  let folders = config.folders.filter((f) => f.exists)

  if (params.folders) {
    const names = params.folders.split(",").map((n) => n.trim().toLowerCase())
    folders = folders.filter((f) => names.includes(f.name.toLowerCase()))
    if (folders.length === 0) {
      return {
        text: `No matching folders found. Available: ${config.folders.map((f) => f.name).join(", ")}`,
        isError: true,
      }
    }
  }

  const allResults: string[] = []

  for (const folder of folders) {
    const cmd = `find . -name ${JSON.stringify(params.pattern)} -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/.next/*' 2>/dev/null | sort | head -n ${MAX_SEARCH_RESULTS}`

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
      text: `No files matching "${params.pattern}" found across ${folders.length} workspace folders.`,
    }
  }

  return { text: allResults.join("\n") }
}
