import * as path from "path"
import { execSync } from "child_process"
import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { parseWorkspaceFile } from "../parser.js"

const MAX_RESULTS = 200

export const grep: ToolDefinition = tool({
  description: `Search file contents across all folders in a .code-workspace multi-root workspace.
Uses grep to find pattern matches. Results are grouped by workspace folder.
Supports file type filtering via the include parameter (e.g. "*.ts", "*.{ts,tsx}").`,
  args: {
    workspace: tool.schema.string().describe("Path to the .code-workspace file"),
    pattern: tool.schema.string().describe("Search pattern (regex supported)"),
    include: tool.schema.string().optional().describe('File pattern filter (e.g. "*.ts", "*.{ts,tsx}")'),
    folders: tool.schema
      .string()
      .optional()
      .describe("Comma-separated folder names to search (default: all folders)"),
  },
  async execute(args, ctx) {
    const config = parseWorkspaceFile(args.workspace, ctx.directory)
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
      const includeFlag = args.include ? `--include='${args.include}'` : ""
      const cmd = `grep -rn ${includeFlag} --color=never -E ${JSON.stringify(args.pattern)} . 2>/dev/null | head -n ${MAX_RESULTS}`

      try {
        const output = execSync(cmd, {
          cwd: folder.absolutePath,
          encoding: "utf8",
          maxBuffer: 1024 * 1024,
          timeout: 30000,
        }).trim()

        if (output) {
          const lines = output.split("\n").map((line) => {
            const relativeLine = line.startsWith("./") ? line.slice(2) : line
            return `  ${relativeLine}`
          })
          allResults.push(`[${folder.name}] ${folder.absolutePath}`, ...lines, "")
        }
      } catch {
        // grep returns exit code 1 when no matches found
      }
    }

    if (allResults.length === 0) {
      return `No matches found for "${args.pattern}" across ${folders.length} workspace folders.`
    }

    return allResults.join("\n")
  },
})
