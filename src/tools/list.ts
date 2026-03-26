import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { workspaceList } from "../workspace-tool-core.js"

export const list: ToolDefinition = tool({
  description: `Find all .code-workspace files in the current project directory.
Returns a list of workspace files with their absolute paths.
Use this to discover available workspaces before parsing them.`,
  args: {},
  async execute(_args, ctx) {
    return workspaceList(ctx.directory)
  },
})
