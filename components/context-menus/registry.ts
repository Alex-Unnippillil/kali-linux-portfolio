import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type IconSizePreset = 'small' | 'medium' | 'large';

export type ContextMenuId = 'default' | 'desktop' | 'taskbar';

export interface DefaultMenuContext {
  active: boolean;
  onClose?: () => void;
}

export interface DesktopMenuContext {
  active: boolean;
  addNewFolder?: () => void;
  openShortcutSelector?: () => void;
  openApp: (id: string) => void;
  iconSizePreset: IconSizePreset;
  setIconSizePreset: (value: IconSizePreset) => void;
  clearSession?: () => void;
  requestClose?: () => void;
}

export interface TaskbarMenuContext {
  active: boolean;
  minimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  onCloseMenu?: () => void;
}

export type ContextMenuContextMap = {
  default: DefaultMenuContext;
  desktop: DesktopMenuContext;
  taskbar: TaskbarMenuContext;
};

export interface ContextMenuItem<K extends ContextMenuId> {
  id: string;
  order?: number;
  when?: (context: ContextMenuContextMap[K]) => boolean;
  render: (context: ContextMenuContextMap[K]) => ReactNode;
}

export type MenuProvider<K extends ContextMenuId> = (
  context: ContextMenuContextMap[K],
) =>
  | ContextMenuItem<K>
  | ContextMenuItem<K>[]
  | null
  | undefined
  | Promise<ContextMenuItem<K> | ContextMenuItem<K>[] | null | undefined>;

type RegistryRecord = {
  [K in ContextMenuId]: Set<MenuProvider<K>>;
};

const registry: RegistryRecord = {
  default: new Set(),
  desktop: new Set(),
  taskbar: new Set(),
};

function normalizeItems<K extends ContextMenuId>(
  items: ContextMenuItem<K> | ContextMenuItem<K>[] | null | undefined,
): ContextMenuItem<K>[] {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

async function resolveProvider<K extends ContextMenuId>(
  provider: MenuProvider<K>,
  menu: ContextMenuId,
  context: ContextMenuContextMap[K],
): Promise<ContextMenuItem<K>[]> {
  try {
    const provided = await provider(context);
    return normalizeItems(provided).filter((item) => {
      if (!item) {
        return false;
      }
      return item.when ? item.when(context) : true;
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[context-menu] Failed to resolve provider for "${menu}"`, error);
    }
    return [];
  }
}

export async function resolveMenuItems<K extends ContextMenuId>(
  menu: K,
  context: ContextMenuContextMap[K],
): Promise<ContextMenuItem<K>[]> {
  const providers = Array.from(registry[menu]) as MenuProvider<K>[];
  const resolved = await Promise.all(
    providers.map((provider) => resolveProvider(provider, menu, context)),
  );
  const flattened = resolved.flat();
  return flattened.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function registerContextMenuItems<K extends ContextMenuId>(
  menu: K,
  provider: MenuProvider<K>,
): () => void {
  const bucket = registry[menu] as Set<MenuProvider<K>>;
  bucket.add(provider);
  return () => {
    bucket.delete(provider);
  };
}

type IdleHandle = number;

type IdleCallback = () => void;

function scheduleIdle(callback: IdleCallback): () => void {
  if (typeof window === 'undefined') {
    callback();
    return () => {};
  }

  const idle = (window as WindowWithIdle).requestIdleCallback;
  if (typeof idle === 'function') {
    const handle = idle(() => {
      callback();
    });
    return () => (window as WindowWithIdle).cancelIdleCallback?.(handle);
  }

  const timeout = window.setTimeout(callback, 0);
  return () => window.clearTimeout(timeout);
}

export function useContextMenuItems<K extends ContextMenuId>(
  menu: K,
  context: ContextMenuContextMap[K],
  active: boolean,
): ContextMenuItem<K>[] {
  const [items, setItems] = useState<ContextMenuItem<K>[]>([]);

  useEffect(() => {
    if (!active) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const resolved = await resolveMenuItems(menu, context);
      if (!cancelled) {
        setItems(resolved);
      }
    };

    const cancelScheduled = scheduleIdle(() => {
      void run();
    });

    return () => {
      cancelled = true;
      cancelScheduled();
    };
  }, [menu, context, active]);

  return items;
}

type WindowWithIdle = Window & {
  requestIdleCallback?: (callback: () => void) => IdleHandle;
  cancelIdleCallback?: (handle: IdleHandle) => void;
};

export type { IconSizePreset };
