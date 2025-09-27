import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    { id: 'alpha-app', title: 'Alpha App', disabled: false },
    { id: 'beta-app', title: 'Beta App', disabled: false },
  ],
}));

import CommandPalette from '../components/CommandPalette';
import {
  CommandPaletteProvider,
  useCommandPaletteStore,
  rankItems,
  type CommandPaletteItem,
} from '../hooks/useCommandPaletteStore';

describe('command palette ranking', () => {
  it('prioritises stronger matches when ranking results', () => {
    const items: CommandPaletteItem[] = [
      {
        id: 'app:terminal',
        label: 'Terminal',
        section: 'Applications',
        description: 'Shell access',
        keywords: ['shell', 'console'],
        onSelect: () => {},
      },
      {
        id: 'app:text-editor',
        label: 'Text Editor',
        section: 'Applications',
        description: 'Write and edit documents',
        keywords: ['gedit', 'editor'],
        onSelect: () => {},
      },
      {
        id: 'action:lock',
        label: 'Lock Screen',
        section: 'Quick Actions',
        description: 'Secure the desktop',
        keywords: ['lock'],
        onSelect: () => {},
        priority: 100,
      },
    ];

    const terminalResults = rankItems(items, 'term');
    expect(terminalResults[0]?.id).toBe('app:terminal');

    const editorResults = rankItems(items, 'edit');
    expect(editorResults[0]?.id).toBe('app:text-editor');
  });
});

describe('command palette interactions', () => {
  it('supports keyboard navigation and selection', async () => {
    const onFirst = jest.fn();
    const onSecond = jest.fn();

    const Harness: React.FC = () => {
      const { open, setItems } = useCommandPaletteStore();
      useEffect(() => {
        setItems([
          {
            id: 'action:first',
            label: 'First Action',
            section: 'Quick Actions',
            onSelect: onFirst,
            keywords: ['first'],
          },
          {
            id: 'action:second',
            label: 'Second Action',
            section: 'Quick Actions',
            onSelect: onSecond,
            keywords: ['second'],
          },
        ]);
        open();
      }, [open, setItems]);
      return <CommandPalette />;
    };

    render(
      <CommandPaletteProvider>
        <Harness />
      </CommandPaletteProvider>,
    );

    const input = await screen.findByRole('combobox');
    expect(input).toHaveFocus();

    await userEvent.type(input, '{ArrowDown}{Enter}');

    expect(onFirst).not.toHaveBeenCalled();
    expect(onSecond).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
