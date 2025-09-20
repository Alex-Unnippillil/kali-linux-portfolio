import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShortcutSelector from '../../components/screen/shortcut-selector';
import { Desktop } from '../../components/screen/desktop';

describe('Spotlight overlay accessibility', () => {
  const apps = [
    { id: 'terminal', title: 'Terminal', icon: '/terminal.png' },
    { id: 'notes', title: 'Notes', icon: '/notes.png' },
    { id: 'settings', title: 'Settings', icon: '/settings.png' },
  ];

  const renderOverlay = (onSelect = jest.fn()) =>
    render(
      <ShortcutSelector
        apps={apps}
        games={[]}
        onSelect={onSelect}
        onClose={jest.fn()}
      />
    );

  it('announces result counts as the user filters', async () => {
    renderOverlay();
    const status = screen.getByRole('status');
    await waitFor(() => expect(status).toHaveTextContent('3 results available.'));

    const input = screen.getByLabelText('Search applications');
    fireEvent.change(input, { target: { value: 'Term' } });
    await waitFor(() => expect(status).toHaveTextContent('1 result available.'));

    fireEvent.change(input, { target: { value: 'zzz' } });
    await waitFor(() => expect(status).toHaveTextContent('No results found.'));
  });

  it('cycles search results with arrow keys and roving tabindex', async () => {
    const onSelect = jest.fn();
    const { container } = renderOverlay(onSelect);
    const input = screen.getByLabelText('Search applications');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const resultButtons = Array.from(container.querySelectorAll('[data-app-id]'));
    expect(resultButtons).toHaveLength(3);

    await waitFor(() => expect(document.activeElement).toBe(resultButtons[0]));
    expect(resultButtons[0].getAttribute('tabindex')).toBe('0');
    expect(resultButtons[1].getAttribute('tabindex')).toBe('-1');

    fireEvent.keyDown(resultButtons[0], { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(resultButtons[1]));
    expect(resultButtons[1].getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(resultButtons[1], { key: 'ArrowUp' });
    await waitFor(() => expect(document.activeElement).toBe(resultButtons[0]));

    fireEvent.keyDown(resultButtons[0], { key: 'ArrowUp' });
    const last = resultButtons[resultButtons.length - 1];
    await waitFor(() => expect(document.activeElement).toBe(last));

    fireEvent.keyDown(last, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(last.getAttribute('data-app-id'));
  });

  it('opens the spotlight overlay when Alt+Space is pressed', () => {
    const desktop = new Desktop({});
    const openShortcutSelector = jest.fn();
    desktop.openShortcutSelector = openShortcutSelector;

    const preventDefault = jest.fn();
    desktop.handleGlobalShortcut({
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      code: 'Space',
      key: ' ',
      target: document.createElement('div'),
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(openShortcutSelector).toHaveBeenCalled();
  });
});
