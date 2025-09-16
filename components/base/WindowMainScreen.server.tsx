import type { ReactNode } from 'react';

interface WindowMainScreenProps {
  screen?: (addFolder?: unknown, openApp?: ((id: string) => void) | undefined) => ReactNode;
  addFolder?: unknown;
  openApp?: ((id: string) => void) | undefined;
  className?: string;
  children?: ReactNode;
}

/**
 * Lightweight server-rendered wrapper used by static pages that want the
 * window styling without pulling the client-only desktop runtime.
 */
export default function WindowMainScreen({
  screen,
  addFolder,
  openApp,
  className = '',
  children,
}: WindowMainScreenProps) {
  const content = screen ? screen(addFolder, openApp) : children;
  const classes = `w-full flex-grow z-20 max-h-full overflow-y-auto windowMainScreen bg-ub-drk-abrgn ${className}`.trim();

  return <div className={classes}>{content}</div>;
}
