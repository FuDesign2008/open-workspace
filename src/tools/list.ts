import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { findWorkspaceFiles } from "../parser.js"

export const list: ToolDefinition = tool({
  description: `Find all .code-workspace files in the current project directory.
Returns a list of workspace files with their absolute paths.
Use this to discover available workspaces before parsing them.`,
  args: {},
  async execute(_args, ctx) {
    const files = findWorkspaceFiles(ctx.directory)

    if (files.length === 0) {
      return `No .code-workspace files found in ${ctx.directory}`
    }

    const result = files.map((f) => ({
      file: f,
      name: f.replace(/^.*\//, "").replace(/\.code-workspace$/, ""),
    }))

    return JSON.stringify(result, null, 2)
  },
})
