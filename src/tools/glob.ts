import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { workspaceGlob } from "../workspace-tool-core.js"

export const glob: ToolDefinition = tool({
  description: `Find files by name pattern across all folders in a .code-workspace multi-root workspace.
Uses find command with glob matching. Results are grouped by workspace folder.
Example patterns: "*.ts", "*.test.*", "package.json", "**/*.config.*"
If no workspace is specified, uses the currently selected workspace (set via workspace_select).`,
  args: {
    workspace: tool.schema
      .string()
      .optional()
      .describe(
        "Path to the .code-workspace file (optional if workspace_select was used)",
      ),
    pattern: tool.schema
      .string()
      .describe('Glob pattern to match file names (e.g. "*.ts", "package.json")'),
    folders: tool.schema
      .string()
      .optional()
      .describe(
        "Comma-separated folder names to search (default: all folders)",
      ),
  },
  async execute(args, ctx) {
    const r = workspaceGlob(
      {
        workspace: args.workspace,
        pattern: args.pattern,
        folders: args.folders,
      },
      ctx.directory,
    )
    if (r.isError) {
      throw new Error(r.text)
    }
    return r.text
  },
})
