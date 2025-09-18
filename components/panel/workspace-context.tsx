'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface WorkspaceDescriptor {
  id: string;
  label: string;
}

export interface WorkspaceStateSnapshot {
  closed_windows: Record<string, boolean>;
  minimized_windows: Record<string, boolean>;
  focused_windows: Record<string, boolean>;
  overlapped_windows: Record<string, boolean>;
  window_positions: Record<string, { x: number; y: number }>;
  desktop_apps: string[];
  app_stack: string[];
}

interface WorkspaceManagerValue {
  workspaces: WorkspaceDescriptor[];
  activeWorkspace: string;
  switchWorkspace: (id: string) => void;
  goToNextWorkspace: () => void;
  goToPreviousWorkspace: () => void;
  updateWorkspaceState: (id: string, snapshot: WorkspaceStateSnapshot) => void;
  getWorkspaceState: (id: string) => WorkspaceStateSnapshot;
  workspaceStates: Record<string, WorkspaceStateSnapshot>;
}

const WORKSPACES: WorkspaceDescriptor[] = [
  { id: 'workspace-1', label: '1' },
  { id: 'workspace-2', label: '2' },
  { id: 'workspace-3', label: '3' },
];

const createEmptySnapshot = (): WorkspaceStateSnapshot => ({
  closed_windows: {},
  minimized_windows: {},
  focused_windows: {},
  overlapped_windows: {},
  window_positions: {},
  desktop_apps: [],
  app_stack: [],
});

const createInitialWorkspaceStates = () => {
  const initial: Record<string, WorkspaceStateSnapshot> = {};
  WORKSPACES.forEach((workspace) => {
    initial[workspace.id] = createEmptySnapshot();
  });
  return initial;
};

export const WorkspaceContext = createContext<WorkspaceManagerValue | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const workspaceStatesRef = useRef<Record<string, WorkspaceStateSnapshot>>(createInitialWorkspaceStates());
  const [activeWorkspace, setActiveWorkspace] = useState<string>(WORKSPACES[0].id);
  const [revision, setRevision] = useState(0);

  const ensureSnapshot = useCallback((id: string) => {
    if (!workspaceStatesRef.current[id]) {
      workspaceStatesRef.current[id] = createEmptySnapshot();
    }
  }, []);

  const switchWorkspace = useCallback((id: string) => {
    ensureSnapshot(id);
    setActiveWorkspace(id);
  }, [ensureSnapshot]);

  const goToOffset = useCallback((offset: number) => {
    const currentIndex = WORKSPACES.findIndex((ws) => ws.id === activeWorkspace);
    if (currentIndex === -1) {
      setActiveWorkspace(WORKSPACES[0].id);
      return;
    }
    const nextIndex = (currentIndex + offset + WORKSPACES.length) % WORKSPACES.length;
    setActiveWorkspace(WORKSPACES[nextIndex].id);
  }, [activeWorkspace]);

  const goToNextWorkspace = useCallback(() => goToOffset(1), [goToOffset]);
  const goToPreviousWorkspace = useCallback(() => goToOffset(-1), [goToOffset]);

  const updateWorkspaceState = useCallback((id: string, snapshot: WorkspaceStateSnapshot) => {
    workspaceStatesRef.current[id] = snapshot;
    setRevision((value) => value + 1);
  }, []);

  const getWorkspaceState = useCallback((id: string) => {
    ensureSnapshot(id);
    return workspaceStatesRef.current[id];
  }, [ensureSnapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.altKey) {
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        goToOffset(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        goToOffset(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToOffset]);

  const value = useMemo<WorkspaceManagerValue>(() => ({
    workspaces: WORKSPACES,
    activeWorkspace,
    switchWorkspace,
    goToNextWorkspace,
    goToPreviousWorkspace,
    updateWorkspaceState,
    getWorkspaceState,
    workspaceStates: workspaceStatesRef.current,
  }), [activeWorkspace, getWorkspaceState, goToNextWorkspace, goToPreviousWorkspace, switchWorkspace, updateWorkspaceState, revision]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceManager = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceManager must be used within WorkspaceProvider');
  }
  return context;
};
