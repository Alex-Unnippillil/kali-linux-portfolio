import React from 'react';
import AppHelpModal, { ShortcutItem } from '../help/AppHelpModal';

const shortcuts: ShortcutItem[] = [
  {
    group: 'Selected item',
    keys: ['Delete'],
    title: 'Permanently delete',
    description: 'Removes the highlighted window from trash. Backspace works as well.',
  },
  {
    group: 'Selected item',
    keys: ['Enter'],
    title: 'Restore window',
    description: 'Reopens the highlighted window on the desktop.',
  },
  {
    group: 'Selected item',
    keys: ['R'],
    title: 'Quick restore',
    description: 'Press R as an alternative to Enter to restore the focused item.',
  },
];

const TrashHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <AppHelpModal
    title="Trash shortcuts"
    description="Focus a window tile in trash and use these shortcuts to manage it quickly."
    shortcuts={shortcuts}
    onClose={onClose}
  />
);

export default TrashHelp;
