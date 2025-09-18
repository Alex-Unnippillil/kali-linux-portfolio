export type DragItemType = 'app-shortcut' | 'taskbar-entry' | 'window-tab';
export type DropZoneId = 'desktop' | 'taskbar' | 'window';

export interface DropZoneMeta {
  id: DropZoneId;
  label: string;
  effect: DataTransfer['dropEffect'];
  accepts: DragItemType[];
  getTargets: () => DropZoneTargetInit[];
}

export interface DropZoneTargetInit {
  element: HTMLElement;
  data?: Record<string, string>;
}

export interface DropZoneTarget extends DropZoneTargetInit {
  zone: DropZoneMeta;
}

const getDocument = () => {
  if (typeof document === 'undefined') {
    return null;
  }
  return document;
};

const desktopZone: DropZoneMeta = {
  id: 'desktop',
  label: 'Move',
  effect: 'move',
  accepts: ['app-shortcut', 'taskbar-entry'],
  getTargets: () => {
    const doc = getDocument();
    if (!doc) return [];
    const element = doc.getElementById('desktop');
    if (!element) return [];
    return [{ element }];
  },
};

const taskbarZone: DropZoneMeta = {
  id: 'taskbar',
  label: 'Pin to taskbar',
  effect: 'copy',
  accepts: ['app-shortcut'],
  getTargets: () => {
    const doc = getDocument();
    if (!doc) return [];
    const element = doc.getElementById('taskbar');
    if (!element) return [];
    return [{ element }];
  },
};

const windowZone: DropZoneMeta = {
  id: 'window',
  label: 'Open with',
  effect: 'link',
  accepts: ['app-shortcut', 'window-tab'],
  getTargets: () => {
    const doc = getDocument();
    if (!doc) return [];
    const nodes = Array.from(doc.querySelectorAll('.opened-window'));
    return nodes
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((element) => ({ element, data: element.id ? { targetId: element.id } : undefined }));
  },
};

const ZONES: DropZoneMeta[] = [desktopZone, taskbarZone, windowZone];

export const getDropZoneMetadata = (): DropZoneMeta[] => [...ZONES];

export const resolveDropZones = (type: DragItemType): DropZoneTarget[] => {
  const doc = getDocument();
  if (!doc) return [];
  const zones = ZONES.filter((zone) => zone.accepts.includes(type));
  const results: DropZoneTarget[] = [];
  zones.forEach((zone) => {
    zone.getTargets().forEach((target) => {
      if (!target.element) return;
      results.push({ ...target, zone });
    });
  });
  return results;
};
