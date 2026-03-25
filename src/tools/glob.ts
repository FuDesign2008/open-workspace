import * as path from "path"
import { execSync } from "child_process"
import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { parseWorkspaceFile } from "../parser.js"
import { requireActiveWorkspace } from "../state.js"

const MAX_RESULTS = 200

export const glob: ToolDefinition = tool({
  description: `Find files by name pattern across all folders in a .code-workspace multi-root workspace.
Uses find command with glob matching. Results are grouped by workspace folder.
Example patterns: "*.ts", "*.test.*", "package.json", "**/*.config.*"
If no workspace is specified, uses the currently selected workspace (set via workspace_select).`,
  args: {
    workspace: tool.schema.string().optional().describe("Path to the .code-workspace file (optional if workspace_select was used)"),
    pattern: tool.schema.string().describe('Glob pattern to match file names (e.g. "*.ts", "package.json")'),
    folders: tool.schema
      .string()
      .optional()
      .describe("Comma-separated folder names to search (default: all folders)"),
  },
  async execute(args, ctx) {
    const wsFile = requireActiveWorkspace(args.workspace, ctx.directory)
    const config = parseWorkspaceFile(wsFile, ctx.directory)
    let folders = config.folders.filter((f) => f.exists)

    if (args.folders) {
      const names = args.folders.split(",").map((n) => n.trim().toLowerCase())
      folders = folders.filter((f) => names.includes(f.name.toLowerCase()))
      if (folders.length === 0) {
        throw new Error(`No matching folders found. Available: ${config.folders.map((f) => f.name).join(", ")}`)
      }
    }

    const allResults: string[] = []

    for (const folder of folders) {
      const cmd = `find . -name ${JSON.stringify(args.pattern)} -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/.next/*' 2>/dev/null | sort | head -n ${MAX_RESULTS}`

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
          allResults.push(`[${folder.name}] ${folder.absolutePath}`, ...files, "")
        }
      } catch {
        // find returns exit code 1 on permission errors
      }
    }

    if (allResults.length === 0) {
      return `No files matching "${args.pattern}" found across ${folders.length} workspace folders.`
    }

    return allResults.join("\n")
  },
})
