import type { ReactNode } from 'react';

export interface TabLifecycleHooks {
  onActivate?: () => void;
  onDeactivate?: () => void;
  onClose?: () => void;
}

export interface AppTabDefinition extends TabLifecycleHooks {
  id: string;
  title: string;
  icon?: ReactNode;
  closable?: boolean;
  content: ReactNode;
}

export interface DraggedTabPayload {
  tab: AppTabDefinition;
  sourceWindowId: string;
  onRemove: (targetWindowId: string, beforeTabId?: string) => AppTabDefinition | null;
  onDetach?: () => AppTabDefinition | null;
}
