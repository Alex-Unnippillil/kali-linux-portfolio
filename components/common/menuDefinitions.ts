import type { MenuItem } from './ContextMenu';

export interface MenuDefinition {
  id: string;
  label: string;
  accelerator?: string;
  children?: MenuDefinition[];
}

export const nestedContextMenu: MenuDefinition[] = [
  {
    id: 'open',
    label: 'Open',
    accelerator: 'Enter',
  },
  {
    id: 'share',
    label: 'Share',
    accelerator: 'Ctrl+Shift+S',
    children: [
      {
        id: 'share-email',
        label: 'Email Link…',
        accelerator: 'Ctrl+E',
      },
      {
        id: 'share-export',
        label: 'Export',
        accelerator: 'Ctrl+Shift+X',
        children: [
          {
            id: 'share-export-png',
            label: 'Export as PNG',
            accelerator: 'Ctrl+Shift+P',
          },
          {
            id: 'share-export-pdf',
            label: 'Export as PDF',
            accelerator: 'Ctrl+Shift+F',
          },
        ],
      },
      {
        id: 'share-copy',
        label: 'Copy Link',
        accelerator: 'Ctrl+C',
      },
    ],
  },
  {
    id: 'recent',
    label: 'Open Recent',
    accelerator: 'Ctrl+R',
    children: [
      {
        id: 'recent-report',
        label: 'Quarterly Report.odt',
        accelerator: 'Ctrl+1',
      },
      {
        id: 'recent-charts',
        label: 'Charts.graffle',
        accelerator: 'Ctrl+2',
      },
      {
        id: 'recent-clear',
        label: 'Clear Menu',
        accelerator: 'Ctrl+Backspace',
      },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences…',
    accelerator: 'Ctrl+,',
  },
  {
    id: 'quit',
    label: 'Quit',
    accelerator: 'Ctrl+Q',
  },
];

export const toMenuItems = (
  definitions: MenuDefinition[],
  onSelect: (id: string) => void,
): MenuItem[] =>
  definitions.map(def => ({
    label: def.label,
    accelerator: def.accelerator,
    submenu: def.children ? toMenuItems(def.children, onSelect) : undefined,
    onSelect: def.children ? undefined : () => onSelect(def.id),
  }));

