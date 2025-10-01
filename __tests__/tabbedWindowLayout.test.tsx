import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TabbedWindow, { TabDefinition } from '../components/ui/TabbedWindow';
import { DEFAULT_CASCADE_OFFSETS, TABBED_WINDOW_LAYOUT_STORAGE_KEY } from '../utils/windowLayout';

const createTabs = (count: number): TabDefinition[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `tab-${index + 1}`,
    title: `Tab ${index + 1}`,
    content: <div>Content {index + 1}</div>,
  }));

beforeEach(() => {
  localStorage.clear();
});

describe('TabbedWindow layout presets', () => {
  it('applies grid layout preset', async () => {
    render(
      <TabbedWindow
        initialTabs={createTabs(3)}
      />,
    );

    const select = screen.getByLabelText(/layout preset/i);
    fireEvent.change(select, { target: { value: 'grid' } });

    const container = await screen.findByTestId('tabbed-window-multi-layout');
    expect(container).toHaveAttribute('data-layout-mode', 'grid');
    expect(container.querySelector('.grid')).not.toBeNull();
    const panels = screen.getAllByTestId('tabbed-window-panel');
    expect(panels).toHaveLength(3);
  });

  it('cascades panels with deterministic spacing', async () => {
    render(<TabbedWindow initialTabs={createTabs(2)} />);

    const select = screen.getByLabelText(/layout preset/i);
    fireEvent.change(select, { target: { value: 'cascade' } });

    const container = await screen.findByTestId('tabbed-window-multi-layout');
    expect(container).toHaveAttribute('data-layout-mode', 'cascade');
    const panels = screen.getAllByTestId('tabbed-window-panel');
    expect(panels[0].style.top).toBe('0px');
    expect(panels[0].style.left).toBe('0px');
    expect(panels[1].style.top).toBe(`${DEFAULT_CASCADE_OFFSETS.y}px`);
    expect(panels[1].style.left).toBe(`${DEFAULT_CASCADE_OFFSETS.x}px`);
  });

  it('persists layout selection across reloads', async () => {
    const layoutKey = 'test-layout';
    const first = render(
      <TabbedWindow
        initialTabs={createTabs(2)}
        layoutStorageKey={layoutKey}
      />,
    );

    const select = screen.getByLabelText(/layout preset/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'grid' } });

    await waitFor(() => {
      const stored = localStorage.getItem(TABBED_WINDOW_LAYOUT_STORAGE_KEY);
      expect(stored).toContain(layoutKey);
      expect(stored).toContain('grid');
    });

    first.unmount();

    render(
      <TabbedWindow
        initialTabs={createTabs(2)}
        layoutStorageKey={layoutKey}
      />,
    );

    const persistedSelect = screen.getByLabelText(/layout preset/i) as HTMLSelectElement;
    expect(persistedSelect.value).toBe('grid');
    const gridContainer = await screen.findByTestId('tabbed-window-multi-layout');
    expect(gridContainer).toHaveAttribute('data-layout-mode', 'grid');
  });
});

