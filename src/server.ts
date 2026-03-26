#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import {
  workspaceGlob,
  workspaceGrep,
  workspaceList,
  workspaceParse,
  workspaceRead,
  workspaceSelect,
} from "./workspace-tool-core.js"

function getDirectory(): string {
  return process.env.WORKSPACE_DIR || process.cwd()
}

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

server.registerTool("workspace_list", {
  description:
    "Find all .code-workspace files in the current project directory. Returns a list of workspace files with their absolute paths.",
}, async () => {
  const text = workspaceList(getDirectory())
  return { content: [{ type: "text", text }] }
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
  const text = workspaceSelect(workspace, getDirectory())
  return { content: [{ type: "text", text }] }
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
  const text = workspaceParse(file, getDirectory())
  return { content: [{ type: "text", text }] }
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
}, async ({
  workspace,
  folder: folderName,
  file: filePath,
  offset: offsetArg,
  limit: limitArg,
}) => {
  const r = workspaceRead(
    {
      workspace,
      folder: folderName,
      file: filePath,
      offset: offsetArg,
      limit: limitArg,
    },
    getDirectory(),
  )
  return {
    content: [{ type: "text", text: r.text }],
    ...(r.isError ? { isError: true } : {}),
  }
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
  const r = workspaceGrep(
    { workspace, pattern, include, folders: foldersArg },
    getDirectory(),
  )
  return {
    content: [{ type: "text", text: r.text }],
    ...(r.isError ? { isError: true } : {}),
  }
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
      .describe(
        'Glob pattern to match file names (e.g. "*.ts", "package.json")',
      ),
    folders: z
      .string()
      .optional()
      .describe(
        "Comma-separated folder names to search (default: all folders)",
      ),
  },
}, async ({ workspace, pattern, folders: foldersArg }) => {
  const r = workspaceGlob(
    { workspace, pattern, folders: foldersArg },
    getDirectory(),
  )
  return {
    content: [{ type: "text", text: r.text }],
    ...(r.isError ? { isError: true } : {}),
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
