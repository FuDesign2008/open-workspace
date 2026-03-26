# 维护者指南

面向本仓库维护者：如何将 `open-workspace` 发布到 npm，以及 GitHub Actions 所需配置。

## 当前状态

- **npm 包名：** `open-workspace`（与 `package.json` 中 `name` 一致）。
- **尚未发布时：** 执行 `npm view open-workspace version` 会得到 404，属正常；**首次成功的 `npm publish` 会在 registry 上创建该包**。

## 推荐路径：GitHub Release + `NPM_TOKEN`

工作流文件：[`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml)。在 GitHub 上 **Publish** 一条 **Release（非草稿）** 后，会自动执行 `npm ci` → `npm test` → `npm publish --access public`。`npm publish` 前会执行 `prepublishOnly`（`npm run build`），保证 `dist/` 已生成。

---

## 1. 一次性：配置 `NPM_TOKEN`

### 1.1 前置条件

- 使用具备 **发布权限** 的 npm 账户（个人账户或组织成员权限）。
- npm 账户 **邮箱已验证**；若组织有 **2FA 要求**，须已开启。
- CI 场景请使用下方 **Automation** 或 **Granular** 令牌；**不要用**需要网页 OTP 的流程令牌做主发布通道。

### 1.2 方式 A：Granular Access Token（推荐）

1. 登录 [npmjs.com](https://www.npmjs.com/) → 头像 → **Access Tokens** → **Generate New Token** → **Granular Access Token**。
2. 建议配置：
   - **Token name：** 如 `github-open-workspace-actions`。
   - **Expiration：** 按需（到期前轮换）。
   - **Type：** **Publish**（或等价「可写」选项，依 npm 界面为准）。
   - **Packages and scopes：**
     - **首次发布、包尚不存在：** 可选 **All packages**（或账户下可发布范围），避免漏配 scope。
     - **包已存在：** 可收窄为仅 **open-workspace** 的 **Read and write**。
3. 生成后 **立刻复制** 令牌（只显示一次），备用。

### 1.3 方式 B：Classic Automation Token

1. **Access Tokens** → **Generate New Token** → **Classic Token**。
2. **类型选 `Automation`**：供 CI 使用，**不要求**交互式 2FA OTP（仍须遵守账户与组织策略）。
3. 勿选 **`Publish`（带交互式会话）** 做主 CI 令牌，否则在无浏览器环境下易失败。

### 1.4 写入 GitHub Secret

1. 打开本仓库：**Settings** → **Secrets and variables** → **Actions**。
2. **New repository secret**
   - **Name：**必须是 `NPM_TOKEN`（与工作流里 `NODE_AUTH_TOKEN` 引用一致）。
   - **Secret：**粘贴上一步的令牌。
3. **勿**把令牌提交进仓库或写在 Issue/PR 里。

### 1.5 配置是否生效（建议）

- **Actions** → **Publish npm** → **Run workflow** → 选 `main` → **Run workflow**。  
  - 若 **Publish to npm** 步骤报 `401`、`E403` 或 **npm token**，多半是令牌权限、过期或 Secret 名称错误。  
  - 工作流第一步若提示 **`NPM_TOKEN` 未配置**，说明 Secret 缺失或未对 Actions 生效。

---

## 2. 发版前：`main` 上的版本号

- `package.json` 中的 `version` 即为将要发布到 npm 的版本（例如 `0.2.0`）。
- 若仓库对 `main` 有分支保护，请通过 **PR** 合并版本号变更后再发 Release。
- Git 标签建议使用 `v0.2.0` 等与版本对应，便于对照；**registry 上的版本仅以 `package.json` 为准**。
- **同一版本不可重复发布**：若 `0.2.0` 已存在，再次 `npm publish` 会失败；需先升级 `version`（如 `0.2.1`）再发布。

---

## 3. 创建并发布 GitHub Release

1. **Releases** → **Draft a new release**。
2. **Choose a tag**：新建标签（如 `v0.2.0`），目标为当前 `main` 上已包含目标 `version` 的提交。
3. 填写标题与说明后，点击 **Publish release**（不要只做 **Save draft**）。
4. 仅 **`release` 类型为 `published`** 时会触发工作流；草稿不会触发自动发布。

---

## 4. 验证

- **Actions** 中查看 **Publish npm** 最近一次运行，全部步骤应为绿色。
- 本地或其他机器：`npm view open-workspace version`，应输出刚发布的版本号。
- 可选：`npm view open-workspace` 查看 `dist-tags` 等元数据。

---

## 5. 常见问题排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| `401 Unauthorized` / `ENEEDAUTH` | `NPM_TOKEN` 错误、过期或未注入 | 轮换令牌，检查 Secret 名称须为 `NPM_TOKEN` |
| `403` / `E403` | 账户无发布权、组织策略、IP/2FA 限制 | 检查 npm 组织设置；换用 **Automation** / 正确 Granular 权限 |
| `403 Forbidden - OTP` | 使用了需一次性密码的令牌类型 | 改用 **Automation** 或具备 CI 能力的 Granular token |
| `403 You cannot publish over the previously published versions` / `E409` | 该 `version` 已在 registry | 提高 `package.json` 的 `version` 后重新发 Release / 重跑 workflow |
| `404` on `npm view`（发布前） | 包尚未创建 | 首次发布成功后会消失 |
| Workflow 未运行 | 仅保存了 Release 草稿 | 点击 **Publish release** |
| **Publish npm** 显示未配置 token | 未添加 Secret 或 fork 的 PR 无权限读 Secret | 在**本仓库** Settings 配置；fork 上 Secrets 需单独配置 |

---

## 6. 备选：手动触发工作流

**Actions** → **Publish npm** → **Run workflow**，仍依赖已配置的 `NPM_TOKEN`。适合验证令牌与流水线；**常规发版仍以 Publish release 为准**，以便版本与发行说明一致。

---

## 7. 本地 `npm publish`（仅应急）

本地需已 `npm login` 或使用 `NPM_TOKEN`：

```bash
npm run build
NPM_TOKEN=xxxx npm publish --access public
# 或先 export NPM_TOKEN，再 npm publish
```

常规发版仍建议走 GitHub Actions，保证与 CI 测试一致。

---

## 包内容与发布前行为

- **files：** 见 `package.json`，含 `dist`、`skills` 及列出的 `src` 源码（不含 `*.test.ts`）。
- **prepublishOnly：** `npm run build`，保证发布 tarball 含最新编译产物。

---

## 相关链接

- [npm：About access tokens](https://docs.npmjs.com/about-access-tokens)
- [GitHub：Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- 用户安装说明：[README.md](../README.md) 的 **Install** 一节。
- 变更记录：[fix-log.md](./fix-log.md)。
