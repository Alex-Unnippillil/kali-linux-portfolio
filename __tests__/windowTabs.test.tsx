import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import Window from '../components/desktop/Window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => {
  const React = require('react');
  const MockDraggable = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="draggable-mock">{children}</div>
  );
  MockDraggable.displayName = 'MockDraggable';
  return {
    __esModule: true,
    default: MockDraggable,
  };
});

describe('DesktopWindow tabstrip', () => {
  const baseProps = {
    id: 'test-window',
    focus: () => {},
    hasMinimised: () => {},
    closed: () => {},
    openApp: () => {},
    addFolder: () => {},
    title: 'Base Title',
    screen: (_addFolder: unknown, _openApp: unknown, context: any) => (
      <div data-testid="window-content">{context?.message ?? 'default'}</div>
    ),
  } as const;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders tablist and switches active tab on click', () => {
    const handleSelect = jest.fn();

    render(
      <Window
        {...baseProps}
        initialTabs={[
          { id: 'alpha', title: 'Alpha', context: { message: 'alpha' } },
          { id: 'beta', title: 'Beta', context: { message: 'beta' } },
        ]}
        onTabSelect={handleSelect}
      />,
    );

    const tablist = screen.getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('window-content')).toHaveTextContent('alpha');

    fireEvent.click(screen.getByRole('tab', { name: /Beta/ }));
    expect(handleSelect).toHaveBeenCalledWith('beta');
    expect(screen.getByTestId('window-content')).toHaveTextContent('beta');
    expect(screen.getByRole('tab', { name: /Beta/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('supports reordering tabs via drag and drop', async () => {
    render(
      <Window
        {...baseProps}
        initialTabs={[
          { id: 'alpha', title: 'Alpha', context: { message: 'alpha' } },
          { id: 'beta', title: 'Beta', context: { message: 'beta' } },
          { id: 'gamma', title: 'Gamma', context: { message: 'gamma' } },
        ]}
      />,
    );

    const beta = screen.getByRole('tab', { name: /Beta/ });

    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(type: string, value: string) {
        this.data[type] = value;
      },
      getData(type: string) {
        return this.data[type];
      },
      effectAllowed: 'move',
      dropEffect: 'none',
      setDragImage: jest.fn(),
    };

    const tablist = screen.getByRole('tablist');
    fireEvent.dragStart(beta, { dataTransfer });
    fireEvent.dragOver(tablist, { dataTransfer });
    fireEvent.drop(tablist, { dataTransfer });

    await waitFor(() => {
      const ordered = within(screen.getByRole('tablist')).getAllByRole('tab').map((tab) => tab?.textContent ?? '');
      expect(ordered[ordered.length - 1]).toContain('Beta');
    });

    const persisted = JSON.parse(window.localStorage.getItem('desktop-window-tabs:test-window') || '{}');
    expect(persisted.order).toEqual(['alpha', 'gamma', 'beta']);
  });

  it('invokes tear out callback when tab drag ends without drop', () => {
    const handleTearOut = jest.fn();

    render(
      <Window
        {...baseProps}
        initialTabs={[
          { id: 'alpha', title: 'Alpha', context: { message: 'alpha' } },
          { id: 'beta', title: 'Beta', context: { message: 'beta' } },
        ]}
        onTabTearOut={handleTearOut}
      />,
    );

    const beta = screen.getByRole('tab', { name: /Beta/ });
    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(type: string, value: string) {
        this.data[type] = value;
      },
      getData(type: string) {
        return this.data[type];
      },
      effectAllowed: 'move',
      dropEffect: 'none',
      setDragImage: jest.fn(),
    };

    fireEvent.dragStart(beta, { dataTransfer });
    fireEvent.dragEnd(beta, { dataTransfer, pageX: 200, pageY: 100 });
    expect(handleTearOut).toHaveBeenCalledWith(
      { windowId: 'test-window', tabId: 'beta' },
      expect.objectContaining({
        clientX: expect.any(Number),
        clientY: expect.any(Number),
      }),
    );
  });
});
