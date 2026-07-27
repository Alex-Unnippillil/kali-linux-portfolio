export type WindowId = string;
export type GroupId = string;
export type WorkspaceId = string;

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopWindow {
  id: WindowId;
  appId: string;
  title: string;
  icon?: string;
  bounds: WindowBounds;
  /**
   * Identifier of the group the window is assigned to.
   * `null` when the window is not stacked with others.
   */
  groupId: GroupId | null;
  /**
   * Index of the window within its group ordering. `null` when ungrouped.
   */
  groupIndex: number | null;
  /**
   * Ordering index in the workspace stack. Lower numbers render below higher ones.
   */
  order: number;
  /**
   * z-index tracking to maintain visual stacking between sessions/workspaces.
   */
  zIndex: number;
  /**
   * Whether the window is minimized in the workspace.
   */
  isMinimized: boolean;
  /**
   * Timestamp used for deterministic merges and hydration.
   */
  createdAt: number;
}

export interface DesktopGroup {
  id: GroupId;
  name: string;
  /**
   * Ordering index for the group bar UI.
   */
  order: number;
  /**
   * Window identifiers in the group in their explicit ordering.
   */
  windowIds: WindowId[];
  createdAt: number;
}

export interface WorkspaceSnapshot {
  id: WorkspaceId;
  name: string;
  windows: Record<WindowId, DesktopWindow>;
  /**
   * Z-ordered stack of window identifiers for the workspace.
   */
  windowOrder: WindowId[];
  groups: Record<GroupId, DesktopGroup>;
  /**
   * Ordered list of group identifiers for deterministic rendering.
   */
  groupOrder: GroupId[];
}

export interface WorkspaceState {
  activeWorkspaceId: WorkspaceId;
  workspaces: Record<WorkspaceId, WorkspaceSnapshot>;
}

export interface DesktopWindowSeed {
  id: WindowId;
  appId: string;
  title: string;
  icon?: string;
  bounds?: Partial<WindowBounds>;
  groupId?: GroupId | null;
  isMinimized?: boolean;
}
