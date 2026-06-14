import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VsCodeWrapper from '../components/apps/vscode';

const STACKBLITZ_ORIGIN = 'https://stackblitz.com';
const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');

const setNavigatorOnlineState = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
};

const restoreNavigatorOnlineState = () => {
  if (originalOnLineDescriptor) {
    Object.defineProperty(window.navigator, 'onLine', originalOnLineDescriptor);
  } else {
    setNavigatorOnlineState(true);
  }
};

describe('VSCode wrapper offline mode', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    restoreNavigatorOnlineState();
  });

  it('shows an offline banner when navigator reports offline', () => {
    setNavigatorOnlineState(false);
    render(<VsCodeWrapper />);
    expect(screen.getByRole('status', { name: /offline status/i })).toHaveTextContent(/you are offline/i);
  });

  it('queues file open requests while offline and flushes them when back online', async () => {
    setNavigatorOnlineState(false);
    const windowPostSpy = jest.spyOn(window, 'postMessage').mockImplementation(() => undefined);
    jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<VsCodeWrapper />);
    const user = userEvent.setup();

    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    const readmeButton = await screen.findByRole('button', { name: 'README.md' });
    const iframe = screen.getByTitle('VsCode');
    const bridge = { postMessage: jest.fn() } as Pick<Window, 'postMessage'>;
    Object.defineProperty(iframe, 'contentWindow', {
      configurable: true,
      value: bridge,
    });
    fireEvent.load(iframe);
    await user.click(readmeButton);

    expect(bridge.postMessage).not.toHaveBeenCalled();
    expect(windowPostSpy).not.toHaveBeenCalled();

    setNavigatorOnlineState(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    let calls = bridge.postMessage.mock.calls;
    try {
      await waitFor(() => expect(bridge.postMessage).toHaveBeenCalledTimes(1));
    } catch {
      await waitFor(() => expect(windowPostSpy).toHaveBeenCalledTimes(1));
      calls = windowPostSpy.mock.calls;
    }

    expect(calls[0][0]).toEqual(
      expect.objectContaining({
        type: 'stackblitz:open-resource',
        payload: { path: 'README.md' },
      }),
    );
    expect(calls[0][1]).toBe(STACKBLITZ_ORIGIN);
  });
});
