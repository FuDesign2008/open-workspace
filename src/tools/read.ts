import * as fs from "fs"
import * as path from "path"
import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { parseWorkspaceFile, type WorkspaceFolder } from "../parser.js"

const MAX_LINES = 2000
const MAX_LINE_LENGTH = 2000

function resolveFolder(folders: WorkspaceFolder[], folderName: string): WorkspaceFolder {
  const folder = folders.find(
    (f) => f.name.toLowerCase() === folderName.toLowerCase() || f.path === folderName,
  )
  if (!folder) {
    const available = folders.map((f) => f.name).join(", ")
    throw new Error(`Folder "${folderName}" not found in workspace. Available: ${available}`)
  }
  if (!folder.exists) {
    throw new Error(`Folder "${folder.name}" does not exist on disk: ${folder.absolutePath}`)
  }
  return folder
}

export const read: ToolDefinition = tool({
  description: `Read a file from a specific folder within a .code-workspace multi-root workspace.
Resolves the folder by name, then reads the file relative to that folder's root.
Supports offset and limit for large files. Returns line-numbered content.`,
  args: {
    workspace: tool.schema.string().describe("Path to the .code-workspace file"),
    folder: tool.schema.string().describe("Folder name as defined in the workspace (e.g. 'bulb', 'ydoc')"),
    file: tool.schema.string().describe("File path relative to the folder root (e.g. 'src/index.ts')"),
    offset: tool.schema.number().int().min(1).optional().describe("Start line (1-indexed, default 1)"),
    limit: tool.schema.number().int().min(1).optional().describe("Max lines to read (default 2000)"),
  },
  async execute(args, ctx) {
    const config = parseWorkspaceFile(args.workspace, ctx.directory)
    const folder = resolveFolder(config.folders, args.folder)
    const filePath = path.resolve(folder.absolutePath, args.file)

    if (!filePath.startsWith(folder.absolutePath)) {
      throw new Error("Path traversal detected: file must be within the workspace folder")
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(filePath, { withFileTypes: true })
      const list = entries.map((e) => (e.isDirectory() ? e.name + "/" : e.name)).sort()
      return `Directory: ${filePath}\n\n${list.join("\n")}\n\n(${list.length} entries)`
    }

    const content = fs.readFileSync(filePath, "utf8")
    const allLines = content.split("\n")
    const offset = args.offset ?? 1
    const limit = args.limit ?? MAX_LINES
    const start = offset - 1
    const sliced = allLines.slice(start, start + limit)

    const numbered = sliced.map((line, i) => {
      const truncated = line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) + "..." : line
      return `${start + i + 1}: ${truncated}`
    })

    const hasMore = start + sliced.length < allLines.length
    let output = `[${folder.name}] ${args.file}\n\n${numbered.join("\n")}`

    if (hasMore) {
      output += `\n\n(Showing lines ${offset}-${offset + sliced.length - 1} of ${allLines.length}. Use offset=${offset + sliced.length} to continue.)`
    } else {
      output += `\n\n(End of file - total ${allLines.length} lines)`
    }

    return output
  },
})
