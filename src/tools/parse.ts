import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { parseWorkspaceFile } from "../parser.js"
import { requireActiveWorkspace } from "../state.js"

export const parse: ToolDefinition = tool({
  description: `Parse a .code-workspace file and return all configured folders with their resolved absolute paths.
Each folder includes: name, relative path (as written in the file), absolute path, and whether it exists on disk.
Use this to understand the multi-root workspace structure.
If no file is specified, uses the currently selected workspace (set via workspace_select).`,
  args: {
    file: tool.schema.string().optional().describe("Path to the .code-workspace file (optional if workspace_select was used)"),
  },
  async execute(args, ctx) {
    const wsFile = requireActiveWorkspace(args.file, ctx.directory)
    const config = parseWorkspaceFile(wsFile, ctx.directory)

    const summary = [
      `Workspace: ${config.file}`,
      `Folders (${config.folders.length}):`,
      ...config.folders.map((f) => `  ${f.exists ? "[ok]" : "[missing]"} ${f.name} -> ${f.absolutePath}`),
    ].join("\n")

    return JSON.stringify({ summary, ...config }, null, 2)
  },
})
