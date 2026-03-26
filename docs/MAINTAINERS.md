# 维护者指南

面向本仓库维护者：如何将 `open-workspace` 发布到 npm，以及 GitHub Actions 所需配置。

## 推荐路径：GitHub Release + `NPM_TOKEN`

工作流文件：`[.github/workflows/publish-npm.yml](../.github/workflows/publish-npm.yml)`。在 GitHub 上 **Publish** 一条 **Release（非草稿）** 后，会自动执行 `npm ci` → `npm test` → `npm publish --access public`。发布前，`package.json` 中的 `prepublishOnly` 会执行 `npm run build`。

### 1. 一次性：配置 `NPM_TOKEN`

1. 在 npm 创建 **仅用于 CI** 的令牌（任选其一）：
  - **Granular Access Token**（推荐）：权限需包含对包 **open-workspace** 的 **Read and write**（若包尚未存在，首次发布前可用具备发布权限的账户创建包）。
  - 或 **Classic** 令牌类型选 **Automation**（专门给 CI 使用）。  
   详见 [npm 文档：Access Tokens](https://docs.npmjs.com/about-access-tokens)。
2. 打开本仓库：**Settings** → **Secrets and variables** → **Actions** → **New repository secret**
  - **Name：** `NPM_TOKEN`（须与工作流中一致）  
  - **Secret：** 粘贴上一步的令牌。

### 2. 发版前：`main` 上的版本号

- `package.json` 里的 `**version`** 即为将要出现在 npm 上的版本（例如 `0.2.0`）。  
- 在启用分支保护时，请先通过 PR 将版本号（及变更）合并进 `main`，再发 Release。  
- Git 标签建议使用 `v0.2.0` 等与版本对应；**npm 始终以 `package.json` 的 `version` 为准**。

### 3. 创建并发布 GitHub Release

1. 进入 **Releases** → **Draft a new release**。
2. **Choose a tag**：新建标签（如 `v0.2.0`），指向当前 `main` 上已含目标 `version` 的提交。
3. 填写 Release 标题与说明后，点击 **Publish release**。
  - 工作流由 `**release` 事件且 `published`** 触发；仅保存为草稿不会触发发布。

### 4. 验证

- 在 **Actions** 中查看 **Publish npm** 运行结果。  
- 本地执行：`npm view open-workspace version`。

### 备选：手动触发工作流

在 **Actions** → **Publish npm** → **Run workflow** 可手动运行（仍依赖已配置的 `NPM_TOKEN`），便于排查；平时仍以 **Publish release** 为准，以便版本与发行说明一致。

### 不推荐：本地 `npm publish`

仅在应急或调试时使用；常规发版请走 Release，以便 CI 统一执行测试与构建。

## 包内容与发布前行为

- `**files`：** 见 `package.json`，包含 `dist`、`skills` 及发布所需的 `src` 源码（不含 `*.test.ts`）。  
- `**prepublishOnly`：** `npm run build`，保证 `dist/` 在发布 tarball 前已生成。

## 相关链接

- 用户安装说明：[README.md](../README.md) 的 **Install** 一节。  
- 变更记录：[fix-log.md](./fix-log.md)。

