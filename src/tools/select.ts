import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { workspaceSelect } from "../workspace-tool-core.js"

export const select: ToolDefinition = tool({
  description: `Select a .code-workspace file as the active workspace for this session.
Once selected, other workspace_* tools will use it automatically without needing the workspace parameter.
Call without arguments to see the current selection and available workspaces.
Call with a workspace file path or name to select it.
Call with action "clear" to deselect the current workspace.`,
  args: {
    workspace: tool.schema
      .string()
      .optional()
      .describe(
        'Workspace file path, name (e.g. "bulb-one"), or "clear" to deselect',
      ),
  },
  async execute(args, ctx) {
    return workspaceSelect(args.workspace, ctx.directory)
  },
})
