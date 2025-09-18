import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import VsCode, { type ExternalFrameHandle } from '../apps/vscode';
import { VsCodeMessagingWrapper, HEARTBEAT_TIMEOUT_MS } from '../components/apps/vscode';

describe('VS Code messaging manager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const setup = async () => {
    const frameRef = React.createRef<ExternalFrameHandle | null>();
    const postMessageSpy = jest.spyOn(window, 'postMessage');

    render(<VsCodeMessagingWrapper openApp={jest.fn()} frameRef={frameRef} VsCodeComponent={VsCode} />);

    const iframe = await screen.findByTitle('VsCode');
    const contentWindow = { postMessage: jest.fn() } as unknown as Window;

    Object.defineProperty(iframe, 'contentWindow', {
      value: contentWindow,
      configurable: true,
    });

    await waitFor(() => expect(frameRef.current).not.toBeNull());

    await act(async () => {
      fireEvent.load(iframe);
    });

    const handshakeCalls = (contentWindow.postMessage as jest.Mock).mock.calls;
    const firstCall = handshakeCalls[0];
    if (!firstCall) {
      throw new Error('expected handshake postMessage call');
    }
    const nonce = firstCall[0]?.nonce;

    return { frameRef, iframe, contentWindow, nonce, postMessageSpy };
  };

  it('performs a guarded handshake with allowed origins', async () => {
    const { contentWindow, nonce, postMessageSpy } = await setup();

    expect(nonce).toBeDefined();

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://stackblitz.com',
          data: { type: 'vscode:init', nonce },
          source: contentWindow,
        }),
      );
    });

    const postMessageMock = contentWindow.postMessage as jest.Mock;
    const ackCall = postMessageMock.mock.calls.find(
      ([payload, origin]) => origin === 'https://stackblitz.com' && payload?.type === 'vscode:ack',
    );
    expect(ackCall?.[0]).toEqual(expect.objectContaining({ type: 'vscode:ack', nonce }));

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        __externalFrameForwarded: true,
        origin: 'https://stackblitz.com',
        payload: expect.objectContaining({ type: 'vscode:init', nonce }),
      }),
      expect.any(String),
    );

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://stackblitz.com',
          data: { type: 'vscode:ping', nonce },
          source: contentWindow,
        }),
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS - 1);
    });

    expect(screen.queryByTestId('vscode-crash-overlay')).toBeNull();
  });

  it('rejects messages from unexpected origins', async () => {
    const { contentWindow, nonce } = await setup();

    const initialCalls = (contentWindow.postMessage as jest.Mock).mock.calls.length;

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://evil.example',
          data: { type: 'vscode:init', nonce },
          source: contentWindow,
        }),
      );
    });

    expect((contentWindow.postMessage as jest.Mock).mock.calls.length).toBe(initialCalls);
    expect(screen.queryByTestId('vscode-crash-overlay')).toBeNull();
  });

  it('reloads the iframe when heartbeat pings stop', async () => {
    const { contentWindow, nonce, frameRef } = await setup();

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://stackblitz.com',
          data: { type: 'vscode:init', nonce },
          source: contentWindow,
        }),
      );
    });

    const controller = frameRef.current;
    expect(controller).not.toBeNull();
    const reloadSpy = jest.spyOn(controller!, 'reload');

    await act(async () => {
      jest.advanceTimersByTime(HEARTBEAT_TIMEOUT_MS + 1);
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('vscode-crash-overlay')).toBeInTheDocument();
  });
});
