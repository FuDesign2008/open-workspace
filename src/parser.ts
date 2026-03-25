import * as fs from "fs"
import * as path from "path"

export interface WorkspaceFolder {
  name: string
  path: string
  absolutePath: string
  exists: boolean
}

export interface WorkspaceConfig {
  file: string
  folders: WorkspaceFolder[]
  settings: Record<string, unknown>
}

/**
 * Strip single-line (//) and multi-line comments from JSONC,
 * preserving strings that contain // or comment-like sequences.
 */
function stripJsoncComments(text: string): string {
  let result = ""
  let i = 0
  const len = text.length

  while (i < len) {
    if (text[i] === '"') {
      const start = i
      i++
      while (i < len && text[i] !== '"') {
        if (text[i] === "\\") i++
        i++
      }
      i++
      result += text.slice(start, i)
      continue
    }

    if (text[i] === "/" && text[i + 1] === "/") {
      while (i < len && text[i] !== "\n") i++
      continue
    }

    if (text[i] === "/" && text[i + 1] === "*") {
      i += 2
      while (i < len && !(text[i] === "*" && text[i + 1] === "/")) i++
      i += 2
      continue
    }

    result += text[i]
    i++
  }

  return result
}

/**
 * Strip trailing commas that JSON doesn't allow but JSONC does.
 * Handles trailing commas before ] and }.
 */
function stripTrailingCommas(text: string): string {
  return text.replace(/,\s*([\]}])/g, "$1")
}

/**
 * Parse a JSONC (JSON with Comments) string.
 */
function parseJsonc(text: string): unknown {
  const stripped = stripTrailingCommas(stripJsoncComments(text))
  return JSON.parse(stripped)
}

/**
 * Parse a .code-workspace file and resolve folder paths.
 *
 * @param workspaceFilePath - Absolute or relative path to the .code-workspace file
 * @param basePath - Base path for resolving relative workspaceFilePath (defaults to cwd)
 */
export function parseWorkspaceFile(workspaceFilePath: string, basePath?: string): WorkspaceConfig {
  const resolvedPath = path.isAbsolute(workspaceFilePath)
    ? workspaceFilePath
    : path.resolve(basePath ?? process.cwd(), workspaceFilePath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Workspace file not found: ${resolvedPath}`)
  }

  const raw = fs.readFileSync(resolvedPath, "utf8")
  const parsed = parseJsonc(raw) as Record<string, unknown>

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid workspace file format: ${resolvedPath}`)
  }

  const rawFolders = (parsed.folders ?? []) as Array<{ path?: string; uri?: string; name?: string }>
  const wsDir = path.dirname(resolvedPath)

  const folders: WorkspaceFolder[] = rawFolders
    .filter((f) => f.path != null)
    .map((f) => {
      const folderPath = f.path!
      const absolutePath = path.resolve(wsDir, folderPath)
      const name = f.name ?? path.basename(absolutePath)
      const exists = fs.existsSync(absolutePath)
      return { name, path: folderPath, absolutePath, exists }
    })

  const settings = (parsed.settings ?? {}) as Record<string, unknown>

  return {
    file: resolvedPath,
    folders,
    settings,
  }
}

/**
 * Find all .code-workspace files in a directory (non-recursive, top-level only).
 */
export function findWorkspaceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return []

  return fs
    .readdirSync(directory)
    .filter((f) => f.endsWith(".code-workspace"))
    .map((f) => path.join(directory, f))
    .sort()
}
