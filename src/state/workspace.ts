import usePersistentState from '../../hooks/usePersistentState';

export interface WorkspaceMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const DEFAULT_MARGINS: WorkspaceMargins = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const isMargins = (v: unknown): v is WorkspaceMargins =>
  typeof v === 'object' && v !== null &&
  ['top', 'right', 'bottom', 'left'].every(
    (key) => typeof (v as Record<string, unknown>)[key] === 'number'
  );

export const useWorkspaceMargins = () =>
  usePersistentState<WorkspaceMargins>('workspace:margins', DEFAULT_MARGINS, isMargins);

