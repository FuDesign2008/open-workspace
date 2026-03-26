# 修复与变更记录

## 2026-03-26 — `ows:read` 技能文档与工具一致

**状态：已修复**

**修复方式：** 更新 `skills/read/SKILL.md`：将错误的前置技能名 `workspace-select` 改为与 README 一致的 `ows:select`（并写明对应工具 `workspace_select`）；补充 `workspace_read` 的可选参数 `workspace` 与 `offset` 默认值说明；将示例中的 `main.ts` 改为更常见的 `src/main.ts` 路径。同步修正 `skills/search/SKILL.md` 中相同的前置技能表述，并写明 `workspace_grep` / `workspace_glob` 可选用 `workspace`。

**验证场景列表：**

**场景 1 — 阅读技能定义**

1. 打开 `skills/read/SKILL.md`。
2. 核对「Prerequisites」「Step 2」与 `README.md` / `src/server.ts` 中 `workspace_read` 行为。

**预期结果：** 前置条件写清 `ows:select` 与可选 `workspace`；示例与多根目录工程常见布局一致。

**场景 2 — 阅读搜索技能定义**

1. 打开 `skills/search/SKILL.md`。
2. 核对「Prerequisites」与 `workspace_grep`、`workspace_glob` 的 `workspace` 可选行为。

**预期结果：** 与 `ows:select` / `workspace_select` 及显式 `workspace` 参数说明一致。

---

## 2026-03-26 — MCP 与 OpenCode 工具逻辑单轨（`workspace-tool-core`）

**状态：已修复**

**修复方式：** 新增 `src/workspace-tool-core.ts`，集中实现 `workspace_list` / `workspace_select` / `workspace_parse` / `workspace_read` / `workspace_grep` / `workspace_glob` 的业务逻辑；`src/server.ts` 仅负责 MCP 注册与入参映射；`src/tools/*.ts` 改为薄封装并调用同一核心。更新 `README.md` 架构说明。OpenCode 插件侧 `workspace_read` 等在错误时抛出的文案与 MCP 的 `isError` 文本统一为核心模块中的字符串（含 `Error:` 前缀的路径穿越 / 未找到文件提示）。

**验证场景列表：**

**场景 1 — 类型检查与构建**

1. 在仓库根目录执行 `npm run typecheck`。
2. 执行 `npm run build`。

**预期结果：** 均无错误，生成 `dist/` 产物。

**场景 2 — MCP `workspace_read` 错误形态**

1. 在已配置 MCP 的客户端中调用 `workspace_read`，传入会导致路径穿越或文件不存在的参数。

**预期结果：** 返回 `isError: true`，正文与重构前 MCP 行为一致（路径穿越 / 未找到文件提示）。

**场景 3 — OpenCode 插件工具**

1. 在 OpenCode 中加载插件，对不存在文件或非法路径调用 `workspace_read`（或与 grep/glob 的文件夹过滤错误）。

**预期结果：** 以抛错形式失败，错误信息为核心模块返回的同一套文案（可能带 `Error:` 前缀，与此前插件文案略有统一）。

---

## 2026-03-26 — 引入 Vitest 与核心回归测试

**状态：已修复**

**修复方式：** 增加开发依赖 `vitest`，新增 `vitest.config.ts`、`tsconfig.build.json`（`build` 改为 `tsc -p tsconfig.build.json` 以排除 `src/**/*.test.ts` 不进 `dist`）。新增 `src/parser.test.ts`、`src/state.test.ts`、`src/workspace-tool-core.test.ts`。更新 `README.md` 安装/测试说明。

**验证场景列表：**

**场景 1 — 本地测试与构建**

1. 执行 `npm install`、`npm run typecheck`、`npm run build`、`npm test`。

**预期结果：** 类型检查通过，`dist/` 不含 `*.test.ts` 产物，Vitest 全部通过。

**场景 2 — 持续集成**

1. 在 CI 中同样运行 `npm ci`（或 `npm install`）、`npm run typecheck`、`npm test`、`npm run build`。

**预期结果：** 命令链成功；`workspaceGrep` / `workspaceGlob` 测试依赖系统自带 `grep` 与 `find`（与当前 MCP 实现一致）。

---

## 2026-03-26 — GitHub 仓库重命名为 open-workspace

**状态：已修复**

**修复方式：** 使用 `gh repo rename open-workspace` 将远程仓库由 `FuDesign2008/opencode-workspace` 更名为 `FuDesign2008/open-workspace`；本地执行 `git remote set-url origin git@github.com:FuDesign2008/open-workspace.git`。在 `package.json` 增加 `repository`、`bugs`、`homepage` 指向新地址（与 README 中 clone URL 一致）。

**验证场景列表：**

**场景 1 — 远程与克隆**

1. 执行 `gh repo view --json nameWithOwner`。
2. 使用 `git remote -v` 检查 `origin`。

**预期结果：** `nameWithOwner` 为 `FuDesign2008/open-workspace`；`origin` 为 `git@github.com:FuDesign2008/open-workspace.git`（或等效 HTTPS URL）。

---

## 2026-03-26 — 简化安装：npm 发布准备与 README

**状态：已修复**

**修复方式：** `package.json` 将 `skills` 与必要的 `src/*.ts`、`src/tools/*.ts` 列入 `files`（不含 `*.test.ts`）、增加 `prepublishOnly`（发布前 `build`）；新增 `.github/workflows/publish-npm.yml`（Release / 手动触发时用 `NPM_TOKEN` 执行 `npm publish`）；重写 README「Install」：推荐 `npx -y open-workspace@latest` 配置 Claude Code / OpenCode MCP，补充 skills 从 `node_modules` / 全局包链接的步骤，以及维护者发布说明；Skills 小节改为引用上文安装节。

**验证场景列表：**

**场景 1 — 构建与测试**

1. 执行 `npm run build`、`npm test`。

**预期结果：** 通过；`npm pack --dry-run` 列出含 `dist/`、`skills/`、`src/`。

**场景 2 — 维护者首次发版**

1. 配置 `NPM_TOKEN`，在 GitHub 发布 Release 或手动运行 workflow；或本地 `npm publish --access public`。

**预期结果：** npm 上可安装 `open-workspace`；用户可按 README 使用 `npx` 注册 MCP。

---

## 2026-03-26 — 明确以 GitHub Release + NPM_TOKEN 为主发布路径

**状态：已修复**

**修复方式：** README「维护者」整节改为分步说明：创建 npm 令牌、在仓库 Actions Secrets 中配置 `NPM_TOKEN`、保证 `main` 上 `package.json` 版本、Publish GitHub Release（非草稿）、在 Actions / `npm view` 验证；补充手动 `workflow_dispatch` 与「本地 publish 仅应急」。工作流文件增加步骤名称与注释指向 README。

**验证场景列表：**

**场景 1 — 阅读发布说明**

1. 打开 README「维护者：通过 GitHub Release 发布到 npm」。
2. 对照 GitHub 与 npm 界面逐步核对是否可执行。

**预期结果：** 可不依赖本地 `npm publish` 完成常规发版。

**场景 2 — 工作流**

1. 打开 `.github/workflows/publish-npm.yml`。

**预期结果：** `NODE_AUTH_TOKEN` 使用 `secrets.NPM_TOKEN`；`release` 类型为 `published`。

**场景 2 — 推送**

1. 在 `main` 上提交小改动后执行 `git push origin main`。

**预期结果：** 推送成功，无 “repository not found” 或旧名残留。

---

## 2026-03-26 — 维护者说明迁至独立文档

**状态：已修复**

**修复方式：** 新增 `docs/MAINTAINERS.md`，收录发布 npm、配置 `NPM_TOKEN`、GitHub Release、手动工作流及包说明等维护者内容；`README.md` 中对应长文改为指向该文档的简短「维护者」小节；`.github/workflows/publish-npm.yml` 注释改为引用 `docs/MAINTAINERS.md`。

**验证场景列表：**

**场景 1 — 文档可读性**

1. 打开 `docs/MAINTAINERS.md`。  
2. 从 `README.md` 的「维护者」链接跳转。

**预期结果：** 维护流程完整可读，链接有效。

**场景 2 — 工作流注释**

1. 打开 `.github/workflows/publish-npm.yml` 文件头注释。

**预期结果：** 注明维护说明见 `docs/MAINTAINERS.md`。
