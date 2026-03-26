import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { afterEach, describe, expect, it } from "vitest"
import { clearActiveWorkspace, setActiveWorkspace } from "./state.js"
import {
  workspaceGlob,
  workspaceGrep,
  workspaceList,
  workspaceParse,
  workspaceRead,
  workspaceSelect,
} from "./workspace-tool-core.js"

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "open-workspace-core-"))
}

function writeFixture(root: string): { wsPath: string; alphaDir: string } {
  const alphaDir = path.join(root, "alpha")
  fs.mkdirSync(alphaDir)
  fs.writeFileSync(path.join(alphaDir, "note.txt"), "hello grep me\n", "utf8")
  const wsPath = path.join(root, "mono.code-workspace")
  fs.writeFileSync(
    wsPath,
    JSON.stringify({
      folders: [{ path: "./alpha" }],
      settings: {},
    }),
    "utf8",
  )
  return { wsPath, alphaDir }
}

afterEach(() => {
  clearActiveWorkspace()
})

describe("workspaceList", () => {
  it("lists workspace files as JSON", () => {
    const root = tempDir()
    try {
      fs.writeFileSync(path.join(root, "proj.code-workspace"), "{}", "utf8")
      const text = workspaceList(root)
      expect(text).toContain("proj.code-workspace")
      expect(JSON.parse(text)).toEqual([
        {
          file: path.join(root, "proj.code-workspace"),
          name: "proj",
        },
      ])
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("reports when none found", () => {
    const root = tempDir()
    try {
      expect(workspaceList(root)).toMatch(/No \.code-workspace files found/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("workspaceSelect + workspaceParse", () => {
  it("selects by short name and parse uses active workspace", () => {
    const root = tempDir()
    try {
      const { wsPath } = writeFixture(root)
      const out = workspaceSelect("mono", root)
      expect(out).toContain("Selected workspace:")
      expect(out).toContain(wsPath)
      const parsed = workspaceParse(undefined, root)
      expect(parsed).toContain('"name": "alpha"')
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("workspaceParse with explicit file ignores active selection path logic", () => {
    const root = tempDir()
    try {
      const { wsPath } = writeFixture(root)
      const parsed = workspaceParse(wsPath, root)
      expect(parsed).toContain(wsPath.replace(/\\/g, "/"))
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("workspaceRead", () => {
  it("reads file with line numbers", () => {
    const root = tempDir()
    try {
      const { wsPath } = writeFixture(root)
      setActiveWorkspace(wsPath)
      const r = workspaceRead(
        { folder: "alpha", file: "note.txt" },
        root,
      )
      expect(r.isError).toBeUndefined()
      expect(r.text).toContain("1: hello grep me")
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("lists directory entries", () => {
    const root = tempDir()
    try {
      const { wsPath } = writeFixture(root)
      setActiveWorkspace(wsPath)
      const r = workspaceRead({ folder: "alpha", file: "." }, root)
      expect(r.text).toContain("note.txt")
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("returns isError for path traversal", () => {
    const root = tempDir()
    try {
      const { wsPath } = writeFixture(root)
      setActiveWorkspace(wsPath)
      const r = workspaceRead(
        { folder: "alpha", file: "../mono.code-workspace" },
        root,
      )
      expect(r.isError).toBe(true)
      expect(r.text).toMatch(/Path traversal/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("workspaceGrep + workspaceGlob", () => {
  it("finds text in workspace folder", () => {
    const root = tempDir()
    try {
      const { wsPath } = writeFixture(root)
      setActiveWorkspace(wsPath)
      const r = workspaceGrep({ pattern: "grep me" }, root)
      expect(r.isError).toBeUndefined()
      expect(r.text).toContain("note.txt")
      expect(r.text).toMatch(/\[alpha\]/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("glob finds note.txt", () => {
    const root = tempDir()
    try {
      const { wsPath } = writeFixture(root)
      setActiveWorkspace(wsPath)
      const r = workspaceGlob({ pattern: "note.txt" }, root)
      expect(r.isError).toBeUndefined()
      expect(r.text).toContain("note.txt")
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
