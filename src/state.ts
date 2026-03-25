let activeWorkspace: string | undefined

export function getActiveWorkspace(): string | undefined {
  return activeWorkspace
}

export function setActiveWorkspace(workspaceFile: string): void {
  activeWorkspace = workspaceFile
}

export function clearActiveWorkspace(): void {
  activeWorkspace = undefined
}

export function requireActiveWorkspace(explicit: string | undefined, directory: string): string {
  if (explicit) return explicit
  if (activeWorkspace) return activeWorkspace
  throw new Error(
    "No workspace selected. Use workspace_select to choose a workspace first, or pass the workspace parameter explicitly.",
  )
}
