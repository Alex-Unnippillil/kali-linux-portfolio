import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GlobalSearch, {
  GlobalSearchProps,
  GlobalSearchResult,
} from '../components/system/GlobalSearch';

describe('GlobalSearch', () => {
  const baseResults: GlobalSearchResult[] = [
    {
      id: 'terminal',
      title: 'Terminal',
      subtitle: 'Open a terminal window',
      description: 'A simulated shell environment for demo commands.',
      tags: ['App', 'Utility'],
      actions: [
        {
          id: 'open',
          label: 'Open',
          primary: true,
          onSelect: jest.fn(),
        },
        {
          id: 'pin',
          label: 'Pin',
          onSelect: jest.fn(),
        },
      ],
    },
    {
      id: 'notes',
      title: 'Notes',
      subtitle: 'Capture quick thoughts',
      description: 'Lightweight note taking app with sync disabled in demo.',
      previewText: 'Recent notes:\n- Ship the recon-ng walkthrough\n- Update resume PDF',
      actions: [
        {
          id: 'open',
          label: 'Open',
          primary: true,
          onSelect: jest.fn(),
        },
      ],
    },
  ];

  const renderSearch = (props?: Partial<GlobalSearchProps>) =>
    render(
      <GlobalSearch
        open
        results={baseResults}
        onClose={jest.fn()}
        {...props}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the details for the highlighted result', () => {
    renderSearch();

    const details = screen.getByRole('region', { name: /result details/i });
    expect(details).toHaveTextContent('A simulated shell environment for demo commands.');
  });

  it('updates the preview when arrow keys change the highlight', () => {
    renderSearch();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowDown' });

    const details = screen.getByRole('region', { name: /result details/i });
    expect(details).toHaveTextContent(/recent notes/i);
  });

  it('invokes the default action when pressing Enter', () => {
    const onSelect = jest.fn();
    const openAction = jest.fn();
    const results: GlobalSearchResult[] = [
      {
        id: 'terminal',
        title: 'Terminal',
        description: 'Simulated shell',
        actions: [
          { id: 'open', label: 'Open', primary: true, onSelect: openAction },
          { id: 'pin', label: 'Pin', onSelect: jest.fn() },
        ],
      },
    ];

    render(
      <GlobalSearch
        open
        results={results}
        onClose={jest.fn()}
        onSelectResult={onSelect}
      />,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(results[0]);
    expect(openAction).toHaveBeenCalledWith(results[0]);
  });

  it('invokes action callbacks when clicking an action button', () => {
    const pinAction = jest.fn();
    const results: GlobalSearchResult[] = [
      {
        id: 'terminal',
        title: 'Terminal',
        description: 'Simulated shell',
        actions: [
          { id: 'open', label: 'Open', primary: true, onSelect: jest.fn() },
          { id: 'pin', label: 'Pin', onSelect: pinAction },
        ],
      },
    ];

    render(
      <GlobalSearch open results={results} onClose={jest.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /pin/i }));

    expect(pinAction).toHaveBeenCalledWith(results[0]);
  });

  it('restores focus when the search closes', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Focus me';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender, unmount } = render(
      <GlobalSearch open results={baseResults} onClose={jest.fn()} />,
    );

    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());

    rerender(
      <GlobalSearch open={false} results={baseResults} onClose={jest.fn()} />,
    );

    await waitFor(() => expect(trigger).toHaveFocus());

    unmount();
    document.body.removeChild(trigger);
  });

  it('notifies when the highlighted item changes', () => {
    const handleHighlight = jest.fn();
    render(
      <GlobalSearch
        open
        results={baseResults}
        onClose={jest.fn()}
        onHighlightChange={handleHighlight}
      />,
    );

    expect(handleHighlight).toHaveBeenLastCalledWith(baseResults[0]);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowDown' });

    expect(handleHighlight).toHaveBeenLastCalledWith(baseResults[1]);
  });
});
