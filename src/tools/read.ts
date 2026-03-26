import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { workspaceRead } from "../workspace-tool-core.js"

export const read: ToolDefinition = tool({
  description: `Read a file from a specific folder within a .code-workspace multi-root workspace.
Resolves the folder by name, then reads the file relative to that folder's root.
Supports offset and limit for large files. Returns line-numbered content.
If no workspace is specified, uses the currently selected workspace (set via workspace_select).`,
  args: {
    workspace: tool.schema
      .string()
      .optional()
      .describe(
        "Path to the .code-workspace file (optional if workspace_select was used)",
      ),
    folder: tool.schema
      .string()
      .describe("Folder name as defined in the workspace (e.g. 'bulb', 'ydoc')"),
    file: tool.schema
      .string()
      .describe("File path relative to the folder root (e.g. 'src/index.ts')"),
    offset: tool.schema
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Start line (1-indexed, default 1)"),
    limit: tool.schema
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Max lines to read (default 2000)"),
  },
  async execute(args, ctx) {
    const r = workspaceRead(
      {
        workspace: args.workspace,
        folder: args.folder,
        file: args.file,
        offset: args.offset,
        limit: args.limit,
      },
      ctx.directory,
    )
    if (r.isError) {
      throw new Error(r.text)
    }
    return r.text
  },
})
