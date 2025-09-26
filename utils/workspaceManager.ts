export interface WorkspaceSnapshot {
  id: string;
  name: string;
  windows: string[];
  index: number;
}

interface WorkspaceInternal {
  id: string;
  title?: string;
  windows: string[];
}

export interface WorkspaceManagerOptions {
  initialCount?: number;
  minCount?: number;
  maxCount?: number;
}

const DEFAULT_MIN = 1;
const DEFAULT_MAX = 8;

export default class WorkspaceManager {
  private workspaces: WorkspaceInternal[] = [];

  private assignments = new Map<string, string>();

  private activeId: string | null = null;

  private idCounter = 0;

  private readonly minCount: number;

  private readonly maxCount: number;

  constructor(options: WorkspaceManagerOptions = {}) {
    const { initialCount = DEFAULT_MIN, minCount = DEFAULT_MIN, maxCount = DEFAULT_MAX } = options;
    this.minCount = Math.max(1, minCount);
    this.maxCount = Math.max(this.minCount, maxCount);

    const startCount = this.clampCount(initialCount);
    this.ensureWorkspaceCount(startCount);
  }

  get activeWorkspaceId() {
    return this.activeId;
  }

  getWorkspaces(): WorkspaceSnapshot[] {
    return this.workspaces.map((ws, index) => ({
      id: ws.id,
      name: ws.title || `Workspace ${index + 1}`,
      windows: [...ws.windows],
      index,
    }));
  }

  getWorkspaceForWindow(windowId: string): WorkspaceSnapshot | undefined {
    const workspaceId = this.assignments.get(windowId);
    if (!workspaceId) return undefined;
    const index = this.workspaces.findIndex((ws) => ws.id === workspaceId);
    if (index === -1) return undefined;
    const workspace = this.workspaces[index];
    return {
      id: workspace.id,
      name: workspace.title || `Workspace ${index + 1}`,
      windows: [...workspace.windows],
      index,
    };
  }

  setActiveWorkspace(workspaceId: string) {
    if (this.workspaces.some((ws) => ws.id === workspaceId)) {
      this.activeId = workspaceId;
    }
  }

  setWorkspaceTitle(workspaceId: string, title: string) {
    const workspace = this.workspaces.find((ws) => ws.id === workspaceId);
    if (workspace) {
      workspace.title = title.trim();
    }
  }

  registerWindow(windowId: string, workspaceId?: string) {
    if (!windowId) return;
    const target = this.resolveWorkspace(workspaceId ?? this.activeId ?? this.workspaces[0]?.id);
    if (!target) return;

    const currentId = this.assignments.get(windowId);
    if (currentId === target.id) return;

    if (currentId) {
      this.removeWindowFromWorkspace(windowId, currentId);
    }
    this.addWindowToWorkspace(windowId, target.id);
  }

  moveWindow(windowId: string, workspaceId: string) {
    const target = this.resolveWorkspace(workspaceId);
    if (!target) return;

    const currentId = this.assignments.get(windowId);
    if (currentId === target.id) return;

    if (currentId) {
      this.removeWindowFromWorkspace(windowId, currentId);
    }
    this.addWindowToWorkspace(windowId, target.id);
  }

  removeWindow(windowId: string) {
    const workspaceId = this.assignments.get(windowId);
    if (!workspaceId) return;
    this.removeWindowFromWorkspace(windowId, workspaceId);
  }

  setWorkspaceCount(requestedCount: number) {
    const count = this.clampCount(requestedCount);
    this.ensureWorkspaceCount(count);
  }

  private clampCount(count: number) {
    if (!Number.isFinite(count)) return this.minCount;
    const rounded = Math.round(count);
    return Math.min(this.maxCount, Math.max(this.minCount, rounded));
  }

  private ensureWorkspaceCount(count: number) {
    if (count === this.workspaces.length) return;

    if (count > this.workspaces.length) {
      while (this.workspaces.length < count) {
        this.createWorkspace();
      }
      return;
    }

    // shrinking: migrate windows from removed workspaces into the last remaining workspace
    while (this.workspaces.length > count) {
      const removed = this.workspaces.pop();
      if (!removed) break;
      const fallback = this.workspaces[this.workspaces.length - 1];
      if (!fallback) {
        // Should not happen thanks to minCount >= 1, but guard just in case
        const created = this.createWorkspace();
        removed.windows.forEach((win) => this.attachWindowToWorkspace(win, created));
        continue;
      }
      removed.windows.forEach((win) => this.attachWindowToWorkspace(win, fallback));
    }

    if (this.activeId && !this.workspaces.some((ws) => ws.id === this.activeId)) {
      this.activeId = this.workspaces[this.workspaces.length - 1]?.id ?? null;
    }
  }

  private createWorkspace() {
    const workspace: WorkspaceInternal = {
      id: `workspace-${++this.idCounter}`,
      windows: [],
    };
    this.workspaces.push(workspace);
    if (!this.activeId) {
      this.activeId = workspace.id;
    }
    return workspace;
  }

  private resolveWorkspace(workspaceId?: string | null) {
    if (!workspaceId) return undefined;
    return this.workspaces.find((ws) => ws.id === workspaceId);
  }

  private addWindowToWorkspace(windowId: string, workspaceId: string) {
    const workspace = this.resolveWorkspace(workspaceId);
    if (!workspace) return;
    if (!workspace.windows.includes(windowId)) {
      workspace.windows.push(windowId);
    }
    this.assignments.set(windowId, workspace.id);
  }

  private removeWindowFromWorkspace(windowId: string, workspaceId: string) {
    const workspace = this.resolveWorkspace(workspaceId);
    if (!workspace) return;
    workspace.windows = workspace.windows.filter((id) => id !== windowId);
    this.assignments.delete(windowId);
  }

  private attachWindowToWorkspace(windowId: string, workspace: WorkspaceInternal) {
    if (!workspace.windows.includes(windowId)) {
      workspace.windows.push(windowId);
    }
    this.assignments.set(windowId, workspace.id);
  }
}
