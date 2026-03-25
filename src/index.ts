import type { Plugin } from "@opencode-ai/plugin"
import { findWorkspaceFiles, parseWorkspaceFile } from "./parser.js"
import { list } from "./tools/list.js"
import { select } from "./tools/select.js"
import { parse } from "./tools/parse.js"
import { read } from "./tools/read.js"
import { grep } from "./tools/grep.js"
import { glob } from "./tools/glob.js"
import { getActiveWorkspace, setActiveWorkspace } from "./state.js"

const plugin: Plugin = async (input) => {
  return {
    tool: {
      workspace_list: list,
      workspace_select: select,
      workspace_parse: parse,
      workspace_read: read,
      workspace_grep: grep,
      workspace_glob: glob,
    },

    "experimental.chat.system.transform": async (_input, output) => {
      const files = findWorkspaceFiles(input.directory)
      if (files.length === 0) return

      if (files.length === 1 && !getActiveWorkspace()) {
        setActiveWorkspace(files[0])
      }

      const sections: string[] = []
      sections.push("## Multi-Root Workspace")
      sections.push("")

      const active = getActiveWorkspace()

      if (files.length === 1) {
        sections.push(
          "This project has a .code-workspace file. It has been auto-selected.",
        )
        sections.push(
          "Use workspace_* tools to search, read, and navigate across workspace folders.",
        )
      } else {
        sections.push(
          `This project has ${files.length} .code-workspace files.`,
        )
        if (active) {
          sections.push(`Currently selected: ${active}`)
        } else {
          sections.push(
            "**No workspace selected yet.** Use workspace_select to choose one before using other workspace_* tools.",
          )
        }
      }
      sections.push("")

      for (const file of files) {
        try {
          const config = parseWorkspaceFile(file)
          const name = file
            .replace(/^.*\//, "")
            .replace(/\.code-workspace$/, "")
          const marker = file === active ? " (active)" : ""
          sections.push(`### ${name}${marker}`)
          sections.push(`File: ${file}`)
          sections.push(`Folders (${config.folders.length}):`)
          for (const folder of config.folders) {
            const status = folder.exists ? "ok" : "missing"
            sections.push(`  - [${status}] ${folder.name} -> ${folder.absolutePath}`)
          }
          sections.push("")
        } catch {
          // skip unparseable workspace files
        }
      }

      output.system.push(sections.join("\n"))
    },
  }
}

export default plugin
