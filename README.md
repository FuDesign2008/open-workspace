# opencode-workspace

Multi-root workspace support for [OpenCode](https://github.com/sst/opencode) and [Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code), enabling VS Code `.code-workspace` file parsing and cross-directory operations.

## Why

AI coding assistants typically operate in a single project directory. If your codebase spans multiple repositories (monorepo siblings, mobile + web + backend, etc.), you can't search or read across them natively. This plugin bridges that gap by leveraging the same `.code-workspace` files VS Code uses.

## Install

### MCP Server (Claude Code + OpenCode)

The MCP Server is the universal approach — it works with any client that supports the [Model Context Protocol](https://modelcontextprotocol.io).

#### Build

```bash
git clone https://github.com/FuDesign2008/opencode-workspace.git
cd opencode-workspace
npm install
npm run build
```

#### Claude Code

```bash
claude mcp add opencode-workspace -- node /path/to/opencode-workspace/dist/server.js
```

Or add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "opencode-workspace": {
      "command": "node",
      "args": ["/path/to/opencode-workspace/dist/server.js"],
      "env": {
        "WORKSPACE_DIR": "/path/to/your/project"
      }
    }
  }
}
```

#### OpenCode MCP

Add to your `opencode.json` (or `opencode.jsonc`):

```jsonc
{
  "mcp": {
    "opencode-workspace": {
      "type": "local",
      "command": ["node", "/path/to/opencode-workspace/dist/server.js"],
      "enabled": true,
      "environment": {
        "WORKSPACE_DIR": "/path/to/your/project"
      }
    }
  }
}
```

> **Note:** `WORKSPACE_DIR` is optional. If omitted, the server uses the current working directory.

### OpenCode Plugin (Alternative)

If you prefer the native OpenCode plugin system over MCP:

```bash
npm install opencode-workspace
```

Add to your `opencode.jsonc`:

```jsonc
{
  "plugin": ["opencode-workspace"]
}
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

6 tools are available, all prefixed with `workspace_`:

### `workspace_list`

Find all `.code-workspace` files in the current project directory.

### `workspace_select`

Select a workspace as the active one for the current session. Once selected, other tools use it automatically without needing the `workspace` parameter each time.

```
workspace_select                            # show current selection and available workspaces
workspace_select workspace="bulb-one"       # select by name
workspace_select workspace="clear"          # deselect
```

When only one `.code-workspace` file exists, it is auto-selected.

### `workspace_parse`

Parse a workspace file and show all configured folders with their resolved paths.

### `workspace_read`

Read a file from a specific workspace folder. Supports `offset` and `limit` for large files.

```
workspace_read folder="bulb" file="src/index.ts"
```

### `workspace_grep`

Search file contents across all (or selected) workspace folders using regex.

```
workspace_grep pattern="useState" include="*.tsx"
workspace_grep pattern="export default" folders="bulb,ydoc"
```

### `workspace_glob`

Find files by name pattern across all (or selected) workspace folders.

```
workspace_glob pattern="*.config.*"
workspace_glob pattern="package.json" folders="bulb,ydoc"
```

## Skills (OpenCode Slash Commands)

The plugin ships with 3 skills that register as user-invocable slash commands in OpenCode.

| Skill | Trigger phrases | What it does |
|---|---|---|
| `workspace-select` | "select workspace", "switch workspace" | Choose which `.code-workspace` to use |
| `workspace-search` | "search workspace", "grep workspace" | Search file contents or find files by name |
| `workspace-read` | "read workspace file" | Read files from any workspace folder |

### Install Skills

```bash
ln -s "$(pwd)/skills" ~/.config/opencode/skills/opencode-workspace
```

After linking, restart OpenCode. The skills appear as `/opencode-workspace:workspace-select`, etc.

## Architecture

```
src/
  server.ts       # MCP Server entry (stdio transport, registers all 6 tools)
  index.ts        # OpenCode plugin entry (backward compatible)
  parser.ts       # .code-workspace JSONC parser (shared by both entries)
  state.ts        # Session state management (shared by both entries)
  tools/          # Tool implementations in OpenCode plugin format
```

The MCP Server (`server.ts`) and OpenCode plugin (`index.ts`) share the same core logic (`parser.ts`, `state.ts`) but expose tools through different protocols.

## License

MIT
