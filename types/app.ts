import type { ReactNode } from 'react';

export type AppDisplay = {
  (addFolder: (...args: unknown[]) => void, openApp: (id: string) => void): ReactNode;
  prefetch?: () => void;
};

export interface AppMeta {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
  desktop_shortcut?: boolean;
  screen?: AppDisplay;
  resizable?: boolean;
  allowMaximize?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  kaliCategory?: string;
}

