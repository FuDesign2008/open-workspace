import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { findWorkspaceFiles, parseWorkspaceFile } from "../parser.js"
import { setActiveWorkspace, getActiveWorkspace, clearActiveWorkspace } from "../state.js"

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
      .describe('Workspace file path, name (e.g. "bulb-one"), or "clear" to deselect'),
  },
  async execute(args, ctx) {
    const current = getActiveWorkspace()
    const available = findWorkspaceFiles(ctx.directory)

    if (args.workspace === "clear") {
      clearActiveWorkspace()
      return "Workspace deselected. You will need to specify the workspace parameter explicitly."
    }

    if (!args.workspace) {
      const lines: string[] = []
      lines.push(current ? `Active workspace: ${current}` : "No workspace selected.")
      lines.push("")
      lines.push(`Available workspaces in ${ctx.directory}:`)
      for (const file of available) {
        const name = file.replace(/^.*\//, "").replace(/\.code-workspace$/, "")
        const marker = file === current ? " (active)" : ""
        lines.push(`  - ${name}${marker}: ${file}`)
      }
      if (available.length === 0) {
        lines.push("  (none found)")
      }
      return lines.join("\n")
    }

    let resolved: string | undefined

    const candidates = available.filter((f) => f === args.workspace || f.endsWith(`/${args.workspace}`))
    if (candidates.length === 1) {
      resolved = candidates[0]
    }

    if (!resolved) {
      const nameInput = args.workspace.replace(/\.code-workspace$/, "").toLowerCase()
      const byName = available.filter((f) => {
        const fname = f.replace(/^.*\//, "").replace(/\.code-workspace$/, "").toLowerCase()
        return fname === nameInput
      })
      if (byName.length === 1) {
        resolved = byName[0]
      } else if (byName.length > 1) {
        return `Multiple workspaces match "${args.workspace}":\n${byName.map((f) => `  - ${f}`).join("\n")}\nPlease specify the full path.`
      }
    }

    if (!resolved) {
      const names = available.map((f) => f.replace(/^.*\//, "").replace(/\.code-workspace$/, ""))
      return `Workspace "${args.workspace}" not found.\nAvailable: ${names.join(", ") || "(none)"}`
    }

    const config = parseWorkspaceFile(resolved, ctx.directory)
    setActiveWorkspace(resolved)

    const folderSummary = config.folders
      .map((f) => `  ${f.exists ? "[ok]" : "[missing]"} ${f.name} -> ${f.absolutePath}`)
      .join("\n")

    return `Selected workspace: ${resolved}\n\nFolders (${config.folders.length}):\n${folderSummary}`
  },
})
