import { createContext, useContext, ReactNode } from 'react';
import usePersistentState from './usePersistentState';

interface WorkspaceContextValue {
  activeWorkspace: number;
  setActiveWorkspace: (index: number) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  activeWorkspace: 0,
  setActiveWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = usePersistentState<number>(
    'active-workspace',
    0,
    (v): v is number => typeof v === 'number',
  );

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, setActiveWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspaceStore = () => useContext(WorkspaceContext);
