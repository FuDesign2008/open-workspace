---
name: open-workspace:select
version: "1.0.0"
user-invocable: true
description: >
  Select or switch the active .code-workspace for cross-project operations.
  Trigger: "select workspace", "switch workspace", "use workspace",
  "which workspace", "change workspace", "选择 workspace", "切换 workspace",
  "用哪个 workspace".
---

# Workspace Select

Select which `.code-workspace` file to use for cross-project operations in this session.

## When to Use

- The project directory has multiple `.code-workspace` files
- You need to switch to a different workspace mid-session
- You want to check which workspace is currently active

## Workflow

### Step 1: List available workspaces

Call `workspace_list` to discover all `.code-workspace` files in the current directory.

### Step 2: Show choices to the user

Present the available workspaces with their folder contents. For each workspace, call `workspace_parse` to show the folders it contains.

### Step 3: Select

Call `workspace_select` with the user's choice. Accept name (e.g. "bulb-one") or full path.

If only one workspace exists, select it automatically and confirm.

### Step 4: Confirm

Show the selected workspace and its folders. Example:

```
Selected: bulb-one.code-workspace
Folders:
  - bulb -> /path/to/bulb
  - ydoc -> /path/to/ydoc
  - ynote-desktop -> /path/to/ynote-desktop
```

## Deselect

To clear the current workspace selection, call `workspace_select` with `workspace="clear"`.
