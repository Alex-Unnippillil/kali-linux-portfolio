import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import DesktopWindow from '../components/desktop/Window';
import { DesktopZIndexProvider } from '../components/desktop/zIndexManager';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));
jest.mock('react-draggable', () => {
  const React = require('react');
  const MockDraggable = ({ children }: any) => <div data-testid="draggable-mock">{children}</div>;
  MockDraggable.displayName = 'MockDraggable';
  return {
    __esModule: true,
    default: MockDraggable,
  };
});

type HarnessProps = {
  trigger: React.ReactNode;
  onClosed: (id?: string) => void;
};

const noop = () => {};

const WindowHarness: React.FC<HarnessProps> = ({ trigger, onClosed }) => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const target = document.querySelector('[data-test-trigger="true"]') as HTMLElement | null;
    target?.focus();
    setOpen(true);
  }, []);

  const handleClosed = React.useCallback(
    (id?: string) => {
      onClosed(id);
      setOpen(false);
    },
    [onClosed],
  );

  return (
    <DesktopZIndexProvider>
      {trigger}
      {open ? (
        <DesktopWindow
          id="focus-window"
          title="Focus window"
          screen={() => <div>content</div>}
          focus={noop}
          isFocused
          hasMinimised={noop}
          minimized={false}
          resizable
          allowMaximize
          addFolder={noop}
          openApp={noop}
          closed={handleClosed}
          context={{}}
          defaultWidth={60}
          defaultHeight={60}
          snapEnabled={false}
          snapGrid={[8, 8]}
        />
      ) : null}
    </DesktopZIndexProvider>
  );
};

describe('DesktopWindow focus restoration', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });
  });

  afterAll(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: originalMatchMedia,
      });
    } else {
      // @ts-expect-error allow removing mock for cleanup
      delete window.matchMedia;
    }
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('restores focus to the triggering taskbar button when closed', async () => {
    jest.useFakeTimers();
    const order: string[] = [];
    const closed = jest.fn((id?: string) => {
      order.push('closed');
      expect(id).toBe('focus-window');
    });

    render(
      <WindowHarness
        trigger={(
          <button
            type="button"
            data-context="taskbar"
            data-test-trigger="true"
            data-testid="taskbar-trigger"
          >
            Taskbar Button
          </button>
        )}
        onClosed={closed}
      />,
    );

    const trigger = await screen.findByTestId('taskbar-trigger');
    trigger.addEventListener('focus', () => {
      order.push('focus');
    });

    const closeButton = await screen.findByRole('button', { name: /window close/i });

    act(() => {
      fireEvent.click(closeButton);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(closed).toHaveBeenCalledWith('focus-window');
    expect(order).toEqual(['closed', 'focus']);
    expect(trigger).toHaveFocus();
  });

  it('restores focus to the triggering desktop icon when closed', async () => {
    jest.useFakeTimers();
    const order: string[] = [];
    const closed = jest.fn((id?: string) => {
      order.push('closed');
      expect(id).toBe('focus-window');
    });

    render(
      <WindowHarness
        trigger={(
          <div
            role="button"
            tabIndex={0}
            data-context="app"
            data-test-trigger="true"
            data-testid="desktop-trigger"
          >
            Desktop Icon
          </div>
        )}
        onClosed={closed}
      />,
    );

    const trigger = await screen.findByTestId('desktop-trigger');
    trigger.addEventListener('focus', () => {
      order.push('focus');
    });

    const closeButton = await screen.findByRole('button', { name: /window close/i });

    act(() => {
      fireEvent.click(closeButton);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(closed).toHaveBeenCalledWith('focus-window');
    expect(order).toEqual(['closed', 'focus']);
    expect(trigger).toHaveFocus();
  });
});
