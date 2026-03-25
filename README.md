# opencode-workspace

Multi-root workspace support for [OpenCode](https://github.com/sst/opencode), enabling VS Code `.code-workspace` file parsing and cross-directory operations.

## Why

OpenCode operates in a single project directory. If your codebase spans multiple repositories (monorepo siblings, mobile + web + backend, etc.), you can't search or read across them natively. This plugin bridges that gap by leveraging the same `.code-workspace` files VS Code uses.

## Install

### Option A: npm package (recommended)

```bash
npm install opencode-workspace
```

Add to your `opencode.jsonc`:

```jsonc
{
  "plugin": ["opencode-workspace"]
}
```

### Option B: local plugin

Copy the `src/` directory into `.opencode/plugin/opencode-workspace/` in your project:

```
.opencode/
  plugin/
    opencode-workspace/
      index.ts
      parser.ts
      tools/
        list.ts
        parse.ts
        read.ts
        grep.ts
        glob.ts
```

## Setup

Create a `.code-workspace` file in your project root (or use an existing one from VS Code):

```jsonc
{
  "folders": [
    { "path": "../bulb" },
    { "path": "../ydoc" },
    { "path": "../ynote-desktop" },
    { "path": "../ynote-android" },
    { "path": "../ynoteios" }
  ],
  "settings": {}
}
```

Folder paths are resolved relative to the `.code-workspace` file location.

## Tools

The plugin registers 5 tools, all prefixed with `workspace_`:

### `workspace_list`

Find all `.code-workspace` files in the current project directory.

```
> workspace_list
```

### `workspace_parse`

Parse a workspace file and show all configured folders with their resolved paths.

```
> workspace_parse file="bulb-one.code-workspace"
```

### `workspace_read`

Read a file from a specific workspace folder. Supports `offset` and `limit` for large files.

```
> workspace_read workspace="bulb-one.code-workspace" folder="bulb" file="src/index.ts"
```

### `workspace_grep`

Search file contents across all (or selected) workspace folders using regex.

```
> workspace_grep workspace="bulb-one.code-workspace" pattern="useState" include="*.tsx"
> workspace_grep workspace="bulb-one.code-workspace" pattern="export default" folders="bulb,ydoc"
```

### `workspace_glob`

Find files by name pattern across all (or selected) workspace folders.

```
> workspace_glob workspace="bulb-one.code-workspace" pattern="*.config.*"
> workspace_glob workspace="bulb-one.code-workspace" pattern="package.json" folders="bulb,ydoc"
```

## System Prompt Injection

The plugin automatically detects `.code-workspace` files in the project directory and injects workspace context into the system prompt via the `experimental.chat.system.transform` hook. This gives the AI model awareness of available workspace folders without any manual setup.

## License

MIT
