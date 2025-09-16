export type WorkspaceId = 'ws_1' | 'ws_2' | 'ws_3' | 'ws_4';

export const WORKSPACES: WorkspaceId[] = ['ws_1', 'ws_2', 'ws_3', 'ws_4'];
export const DEFAULT_WORKSPACE: WorkspaceId = WORKSPACES[0];

export interface WorkspaceState {
  ws: WorkspaceId;
}

type Listener = (state: WorkspaceState) => void;

class WorkspaceManager {
  private state: WorkspaceState = { ws: DEFAULT_WORKSPACE };
  private listeners: Set<Listener> = new Set();

  getState(): WorkspaceState {
    return this.state;
  }

  setWs(ws: WorkspaceId) {
    if (this.state.ws === ws) return;
    this.state = { ...this.state, ws };
    this.listeners.forEach((listener) => listener(this.state));

    if (typeof window !== 'undefined') {
      const event = new CustomEvent<WorkspaceId>('desktop:workspace-change', {
        detail: ws,
      });
      window.dispatchEvent(event);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

const wm = new WorkspaceManager();

export default wm;
