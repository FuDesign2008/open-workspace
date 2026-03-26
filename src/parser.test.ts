import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { describe, expect, it } from "vitest"
import { findWorkspaceFiles, parseWorkspaceFile } from "./parser.js"

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "open-workspace-test-"))
}

describe("parseWorkspaceFile", () => {
  it("parses JSONC with comments and trailing commas", () => {
    const root = tempDir()
    try {
      const wsPath = path.join(root, "mono.code-workspace")
      const alpha = path.join(root, "alpha")
      fs.mkdirSync(alpha)
      fs.writeFileSync(
        wsPath,
        `{
  // roots
  "folders": [
    { "path": "./alpha", },
  ],
  "settings": {},
}`,
        "utf8",
      )

      const cfg = parseWorkspaceFile(wsPath, root)
      expect(cfg.file).toBe(wsPath)
      expect(cfg.folders).toHaveLength(1)
      expect(cfg.folders[0].name).toBe("alpha")
      expect(cfg.folders[0].exists).toBe(true)
      expect(cfg.folders[0].absolutePath).toBe(alpha)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("throws when workspace file is missing", () => {
    const root = tempDir()
    try {
      expect(() =>
        parseWorkspaceFile(path.join(root, "missing.code-workspace")),
      ).toThrow(/Workspace file not found/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("findWorkspaceFiles", () => {
  it("returns sorted workspace files at directory top level only", () => {
    const root = tempDir()
    try {
      fs.writeFileSync(path.join(root, "b.code-workspace"), "{}", "utf8")
      fs.writeFileSync(path.join(root, "a.code-workspace"), "{}", "utf8")
      fs.mkdirSync(path.join(root, "nested"))
      fs.writeFileSync(
        path.join(root, "nested", "c.code-workspace"),
        "{}",
        "utf8",
      )

      const found = findWorkspaceFiles(root)
      expect(found.map((f) => path.basename(f))).toEqual([
        "a.code-workspace",
        "b.code-workspace",
      ])
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("returns empty array for missing directory", () => {
    expect(findWorkspaceFiles(path.join(tempDir(), "nope"))).toEqual([])
  })
})
