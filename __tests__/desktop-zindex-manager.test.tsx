import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import DesktopWindow from '../components/desktop/Window';
import { DesktopZIndexProvider } from '../components/desktop/zIndexManager';

jest.mock('../components/base/window', () => {
  const React = require('react');
  return React.forwardRef(({ id, focus, zIndex, isFocused, title }, ref) => (
    <button
      ref={ref}
      data-testid={`window-${id}`}
      data-zindex={zIndex}
      data-focused={isFocused ? 'true' : 'false'}
      onClick={() => focus(id)}
      type="button"
    >
      {title || id}
    </button>
  ));
});

const noop = () => {};

type WindowConfig = {
  id: string;
  title: string;
};

const WindowHarness: React.FC = () => {
  const [focused, setFocused] = React.useState<WindowConfig['id']>('second');

  const handleFocus = React.useCallback((id?: string) => {
    if (!id) return;
    setFocused(id);
  }, []);

  const windowProps = {
    screen: noop,
    addFolder: noop,
    openApp: noop,
    context: {},
    hasMinimised: noop,
    minimized: false,
    resizable: true,
    allowMaximize: true,
    onPositionChange: noop,
    onSizeChange: noop,
    snapEnabled: true,
    snapGrid: [1, 1] as [number, number],
    defaultWidth: 50,
    defaultHeight: 50,
  };

  return (
    <>
      <DesktopWindow
        {...windowProps}
        id="first"
        title="First"
        focus={handleFocus}
        isFocused={focused === 'first'}
      />
      <DesktopWindow
        {...windowProps}
        id="second"
        title="Second"
        focus={handleFocus}
        isFocused={focused === 'second'}
      />
    </>
  );
};

describe('Desktop window z-index management', () => {
  it('raises the z-index when a window receives focus', async () => {
    const { getByTestId } = render(
      <DesktopZIndexProvider>
        <WindowHarness />
      </DesktopZIndexProvider>,
    );

    const first = getByTestId('window-first');
    const second = getByTestId('window-second');

    await waitFor(() => {
      const firstZ = Number(first.getAttribute('data-zindex'));
      const secondZ = Number(second.getAttribute('data-zindex'));
      expect(secondZ).toBeGreaterThan(firstZ);
    });

    fireEvent.click(first);

    await waitFor(() => {
      const firstZ = Number(first.getAttribute('data-zindex'));
      const secondZ = Number(second.getAttribute('data-zindex'));
      expect(firstZ).toBeGreaterThan(secondZ);
    });

    fireEvent.click(second);

    await waitFor(() => {
      const firstZ = Number(first.getAttribute('data-zindex'));
      const secondZ = Number(second.getAttribute('data-zindex'));
      expect(secondZ).toBeGreaterThan(firstZ);
    });
  });
});
