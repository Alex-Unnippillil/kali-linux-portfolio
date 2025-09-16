import React from 'react';
import AppHelpModal, { ShortcutItem } from '../help/AppHelpModal';

const shortcuts: ShortcutItem[] = [
  {
    group: 'Address bar',
    keys: ['Enter'],
    title: 'Open highlighted address',
    description:
      'Navigate to the typed URL or the suggestion currently highlighted in the dropdown.',
  },
  {
    group: 'Address bar',
    keys: ['Arrow Down'],
    title: 'Move to next suggestion',
    description:
      'Cycles through search suggestions, history, and bookmarks shown beneath the address field.',
  },
  {
    group: 'Address bar',
    keys: ['Arrow Up'],
    title: 'Move to previous suggestion',
    description: 'Walk back up the suggestion list after exploring other results.',
  },
  {
    group: 'Tab strip',
    keys: ['Arrow Right'],
    title: 'Switch to next tab',
    description: 'Advances to the tab on the right when the tab strip has keyboard focus.',
  },
  {
    group: 'Tab strip',
    keys: ['Arrow Left'],
    title: 'Switch to previous tab',
    description: 'Moves to the tab on the left when the tab strip has keyboard focus.',
  },
  {
    group: 'Tab strip',
    keys: ['Delete'],
    title: 'Close active tab',
    description: 'Removes the focused tab from the strip. A new tab becomes active immediately.',
  },
  {
    group: 'Tab strip',
    keys: ['Ctrl', 'F'],
    title: 'Search open tabs',
    description: 'Focuses the tab search input. Use ⌘+F when running on macOS.',
  },
];

const ChromeHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <AppHelpModal
    title="Chrome keyboard shortcuts"
    description="Use these shortcuts to move quickly between tabs and suggestions in the simulated browser."
    shortcuts={shortcuts}
    onClose={onClose}
  />
);

export default ChromeHelp;
