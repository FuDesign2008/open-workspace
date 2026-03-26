---
name: ows:read
version: "1.0.0"
user-invocable: true
description: >
  Read files from any project folder in the active workspace.
  Trigger: "workspace read", "read from workspace", "read workspace file",
  "open workspace file", "在 workspace 中读取", "读取 workspace 文件",
  "workspace 读文件".
---

# Workspace Read

Read files from any folder within the active `.code-workspace` file.

## Prerequisites

If no `.code-workspace` is active for this session, either use skill `ows:select` (`/ows:select`) and tool `workspace_select`, or pass `workspace` on `workspace_read` with the `.code-workspace` file path.

## Workflow

### Step 1: Identify the target

Determine the folder name and file path from the user's request. If ambiguous, call `workspace_parse` to show available folders.

### Step 2: Read the file

Call `workspace_read` with:
- `workspace` (optional): path to the `.code-workspace` file when nothing is selected (same as for other `workspace_*` tools)
- `folder` (required): folder name as defined in the workspace (e.g. "bulb", "ydoc")
- `file` (required): file path relative to the folder root (e.g. "src/index.ts", "package.json")
- `offset` (optional): start line, 1-indexed (default: 1)
- `limit` (optional): max lines to read (default 2000)

### Step 3: Handle directories

If `file` points to a directory, `workspace_read` returns the directory listing instead. Use this to navigate unfamiliar project structures.

## Examples

- "Read bulb's package.json" → `workspace_read folder="bulb" file="package.json"`
- "Show me ydoc's src directory" → `workspace_read folder="ydoc" file="src"`
- "Read lines 50-100 of ynote-desktop's src/main.ts" → `workspace_read folder="ynote-desktop" file="src/main.ts" offset=50 limit=50`
