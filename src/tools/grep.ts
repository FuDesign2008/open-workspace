import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { workspaceGrep } from "../workspace-tool-core.js"

export const grep: ToolDefinition = tool({
  description: `Search file contents across all folders in a .code-workspace multi-root workspace.
Uses grep to find pattern matches. Results are grouped by workspace folder.
Supports file type filtering via the include parameter (e.g. "*.ts", "*.{ts,tsx}").
If no workspace is specified, uses the currently selected workspace (set via workspace_select).`,
  args: {
    workspace: tool.schema
      .string()
      .optional()
      .describe(
        "Path to the .code-workspace file (optional if workspace_select was used)",
      ),
    pattern: tool.schema.string().describe("Search pattern (regex supported)"),
    include: tool.schema
      .string()
      .optional()
      .describe('File pattern filter (e.g. "*.ts", "*.{ts,tsx}")'),
    folders: tool.schema
      .string()
      .optional()
      .describe(
        "Comma-separated folder names to search (default: all folders)",
      ),
  },
  async execute(args, ctx) {
    const r = workspaceGrep(
      {
        workspace: args.workspace,
        pattern: args.pattern,
        include: args.include,
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
