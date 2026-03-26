import { afterEach, describe, expect, it } from "vitest"
import {
  clearActiveWorkspace,
  getActiveWorkspace,
  requireActiveWorkspace,
  setActiveWorkspace,
} from "./state.js"

afterEach(() => {
  clearActiveWorkspace()
})

describe("requireActiveWorkspace", () => {
  it("returns explicit path when provided", () => {
    expect(requireActiveWorkspace("/x/y.code-workspace", "/any")).toBe(
      "/x/y.code-workspace",
    )
  })

  it("returns active workspace when set", () => {
    setActiveWorkspace("/ws/mono.code-workspace")
    expect(requireActiveWorkspace(undefined, "/cwd")).toBe(
      "/ws/mono.code-workspace",
    )
  })

  it("throws when nothing is selected and no explicit path", () => {
    expect(() => requireActiveWorkspace(undefined, "/cwd")).toThrow(
      /No workspace selected/,
    )
  })
})

describe("getActiveWorkspace / clearActiveWorkspace", () => {
  it("clears selection", () => {
    setActiveWorkspace("/a.code-workspace")
    expect(getActiveWorkspace()).toBe("/a.code-workspace")
    clearActiveWorkspace()
    expect(getActiveWorkspace()).toBeUndefined()
  })
})
