---
name: ows:search
version: "1.0.0"
user-invocable: true
description: >
  Search across all projects in the active workspace — find files by name or
  search file contents.
  Trigger: "workspace search", "search workspace", "search across projects",
  "find in workspace", "grep workspace", "workspace grep", "workspace find",
  "在 workspace 中搜索", "跨项目搜索", "workspace 搜索".
---

# Workspace Search

Search across all folders in the active `.code-workspace` file.

## Prerequisites

If no `.code-workspace` is active for this session, either use skill `ows:select` (`/ows:select`) and tool `workspace_select`, or pass `workspace` on `workspace_grep` / `workspace_glob` with the `.code-workspace` file path.

## Search by Content (grep)

Use `workspace_grep` to search file contents across workspace folders.

Parameters:
- `pattern` (required): regex pattern to search for
- `include` (optional): file type filter, e.g. `"*.ts"`, `"*.{ts,tsx}"`
- `folders` (optional): comma-separated folder names to limit scope

Example flow:
1. User: "search for useState across all projects"
2. Call: `workspace_grep pattern="useState" include="*.{ts,tsx}"`
3. Present results grouped by folder

## Search by Filename (glob)

Use `workspace_glob` to find files by name pattern across workspace folders.

Parameters:
- `pattern` (required): glob pattern, e.g. `"*.config.*"`, `"package.json"`
- `folders` (optional): comma-separated folder names to limit scope

Example flow:
1. User: "find all package.json in workspace"
2. Call: `workspace_glob pattern="package.json"`
3. Present results grouped by folder

## Tips

- Narrow scope with `folders` parameter when you know which projects to search
- Combine with `include` for content search to filter by file type
- Results are capped at 200 matches per folder
