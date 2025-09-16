import React from 'react';
import AppHelpModal, { ShortcutItem } from '../help/AppHelpModal';

const shortcuts: ShortcutItem[] = [
  {
    group: 'Navigation',
    keys: ['Arrow Right'],
    title: 'Show next quote',
    description: 'Loads another quote that matches the current filters and search terms.',
  },
  {
    group: 'Navigation',
    keys: ['Arrow Left'],
    title: 'Show previous quote',
    description: 'Returns to the quote you viewed before the current one.',
  },
];

const QuoteHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <AppHelpModal
    title="Quote app shortcuts"
    description="Browse curated quotes without reaching for the mouse. Shortcuts work while focus is outside of text inputs."
    shortcuts={shortcuts}
    onClose={onClose}
  />
);

export default QuoteHelp;
