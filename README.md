# open-workspace

Multi-root workspace support for [OpenCode](https://github.com/sst/opencode) and [Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code), enabling VS Code `.code-workspace` file parsing and cross-directory operations.

## Why

AI coding assistants typically operate in a single project directory. If your codebase spans multiple repositories (monorepo siblings, mobile + web + backend, etc.), you can't search or read across them natively. This plugin bridges that gap by leveraging the same `.code-workspace` files VS Code uses.

## Install

建议使用 **npm 上的包 + `npx`**：无需克隆仓库，也不必手写本机 `dist/server.js` 路径。包名：**[`open-workspace`](https://www.npmjs.com/package/open-workspace)**（当前版本可用 `npm view open-workspace version` 查看）。

### MCP Server（Claude Code + OpenCode）— 推荐

需要 **Node.js 18+**。MCP 走的是包内 `bin` 入口（`open-workspace` → `dist/server.js`）。

#### Claude Code

```bash
claude mcp add open-workspace -- npx -y open-workspace@latest
```

或在项目根目录 `.mcp.json`：

```json
{
  "mcpServers": {
    "open-workspace": {
      "command": "npx",
      "args": ["-y", "open-workspace@latest"],
      "env": {
        "WORKSPACE_DIR": "/path/to/your/project"
      }
    }
  }
}
```

#### OpenCode（`opencode.json` / `opencode.jsonc`）

```jsonc
{
  "mcp": {
    "open-workspace": {
      "type": "local",
      "command": ["npx", "-y", "open-workspace@latest"],
      "enabled": true,
      "environment": {
        "WORKSPACE_DIR": "/path/to/your/project"
      }
    }
  }
}
```

> **Note:** `WORKSPACE_DIR` 可选；省略时使用当前工作目录。首次 `npx` 拉包会略慢，之后会复用缓存。

#### 固定版本（可选）

将 `open-workspace@latest` 换成 `open-workspace@0.2.0` 等，避免次版本自动升级。

#### 从源码运行 MCP（不推荐日常）

若你已克隆本仓库并完成 `npm install && npm run build`：

```bash
claude mcp add open-workspace -- node /absolute/path/to/open-workspace/dist/server.js
```

### OpenCode 原生插件（不按 MCP）

与 MCP 二选一即可；插件走 `@opencode-ai/plugin`，不启动独立 MCP 进程。

```bash
npm install open-workspace
```

```jsonc
{
  "plugin": ["open-workspace"]
}
```

### Skills（OpenCode 斜杠命令）

安装 **同一 npm 包** 后，技能文件在包目录的 `skills/` 下（全局或项目本地均可）。

全局安装：

```bash
npm install -g open-workspace
ln -sf "$(npm root -g)/open-workspace/skills" ~/.config/opencode/skills/open-workspace
```

仅装在当前项目：

```bash
npm install open-workspace
ln -sf "$(pwd)/node_modules/open-workspace/skills" ~/.config/opencode/skills/open-workspace
```

改完后重启 OpenCode。仍可从 [本仓库 skills 目录](https://github.com/FuDesign2008/open-workspace/tree/main/skills) 用 `ln -s` 指过去。

### 维护者

发布流程、npm 令牌与 GitHub Actions（`NPM_TOKEN`、Release 发版等）见 **[docs/MAINTAINERS.md](docs/MAINTAINERS.md)**。

### 从源码参与开发

```bash
git clone https://github.com/FuDesign2008/open-workspace.git
cd open-workspace
npm install
npm test
npm run build
```

```bash
npm test        # Vitest
npm run test:watch
```

测试覆盖 `parser`、`state`、`workspace-tool-core`（临时目录下的 list / select / read / grep / glob 等）。

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
| `ows:select` | "select workspace", "switch workspace" | Choose which `.code-workspace` to use |
| `ows:search` | "search workspace", "grep workspace" | Search file contents or find files by name |
| `ows:read` | "read workspace file" | Read files from any workspace folder |

安装方式见上文 **Skills（OpenCode 斜杠命令）**。链接成功后重启 OpenCode，可出现 `/ows:select`、`/ows:search`、`/ows:read`。

## Architecture

```
src/
  server.ts                # MCP Server entry (stdio transport, registers all 6 tools)
  index.ts                 # OpenCode plugin entry (backward compatible)
  workspace-tool-core.ts   # Shared workspace_* behavior (list/select/parse/read/grep/glob)
  parser.ts                # .code-workspace JSONC parser
  state.ts                 # Session state (active workspace)
  tools/                   # OpenCode tool wrappers (thin; delegate to workspace-tool-core)
```

The MCP Server (`server.ts`) and OpenCode plugin (`index.ts`) share the same behavior via `workspace-tool-core.ts` (`parser.ts`, `state.ts`), and expose tools through different protocols.

## License

MIT
