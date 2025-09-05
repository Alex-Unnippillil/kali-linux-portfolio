import React, { useMemo } from 'react';
import ContextMenu, { MenuItem } from '../../../components/common/ContextMenu';
import actions from '../../../data/thunar-custom-actions.json';

interface SelectedItem {
  name: string;
  getFile?: () => Promise<File>;
}

interface ThunarContextMenuProps {
  targetRef: React.RefObject<HTMLElement>;
  selection?: SelectedItem[];
  openApp?: (id: string) => void;
}

interface ActionConfig {
  name: string;
  command: string;
  patterns: string[];
}

function globToRegExp(pattern: string): RegExp {
  return new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
}

async function executeAction(
  action: ActionConfig,
  selection: SelectedItem[] = [],
  openApp?: (id: string) => void,
): Promise<void> {
  switch (action.command) {
    case 'open-terminal':
      openApp && openApp('terminal');
      break;
    case 'sha256sum': {
      const item = selection[0];
      if (!item || !item.getFile) return;
      const file = await item.getFile();
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      alert(`${file.name}: ${hash}`);
      break;
    }
    case 'extract-here':
      alert('Extract Here is not implemented in this environment.');
      break;
    case 'chmod-x': {
      const item = selection[0];
      if (item) alert(`Set executable bit for ${item.name}`);
      break;
    }
    default:
      break;
  }
}

const ThunarContextMenu: React.FC<ThunarContextMenuProps> = ({
  targetRef,
  selection = [],
  openApp,
}) => {
  const items: MenuItem[] = useMemo(() => {
    const name = selection[0]?.name || '';
    return (actions as ActionConfig[])
      .filter((a) => a.patterns.some((p) => globToRegExp(p).test(name)))
      .map((a) => ({
        label: a.name,
        onSelect: () => {
          executeAction(a, selection, openApp);
        },
      }));
  }, [selection, openApp]);

  return <ContextMenu targetRef={targetRef} items={items} />;
};

export default ThunarContextMenu;
