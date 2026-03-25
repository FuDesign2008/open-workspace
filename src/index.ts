import type { Plugin } from "@opencode-ai/plugin"
import { findWorkspaceFiles, parseWorkspaceFile } from "./parser.js"
import { list } from "./tools/list.js"
import { parse } from "./tools/parse.js"
import { read } from "./tools/read.js"
import { grep } from "./tools/grep.js"
import { glob } from "./tools/glob.js"

const plugin: Plugin = async (input) => {
  return {
    tool: {
      workspace_list: list,
      workspace_parse: parse,
      workspace_read: read,
      workspace_grep: grep,
      workspace_glob: glob,
    },

    "experimental.chat.system.transform": async (_input, output) => {
      const files = findWorkspaceFiles(input.directory)
      if (files.length === 0) return

      const sections: string[] = []
      sections.push("## Multi-Root Workspace")
      sections.push("")
      sections.push(
        "This project has .code-workspace files enabling cross-directory operations.",
      )
      sections.push(
        "Use workspace_* tools to search, read, and navigate across workspace folders.",
      )
      sections.push("")

      for (const file of files) {
        try {
          const config = parseWorkspaceFile(file)
          const name = file
            .replace(/^.*\//, "")
            .replace(/\.code-workspace$/, "")
          sections.push(`### ${name}`)
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
