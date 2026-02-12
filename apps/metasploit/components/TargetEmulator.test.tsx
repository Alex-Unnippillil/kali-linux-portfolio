import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TargetEmulator from './TargetEmulator';
import modules from '../../../components/apps/metasploit/modules.json';

describe('TargetEmulator', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows deterministic output and resets', () => {
    render(<TargetEmulator />);
    const select = screen.getByLabelText(/select module/i);
    fireEvent.change(select, { target: { value: modules[0].name } });
    const first = screen.getByTestId('session-output').textContent;
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('session-output').textContent).toMatch(/Select a module/);
    fireEvent.change(select, { target: { value: modules[0].name } });
    const second = screen.getByTestId('session-output').textContent;
    expect(first).toBe(second);
  });

  it('persists sessions and allows reopening them', () => {
    const { unmount } = render(<TargetEmulator />);
    const select = screen.getByLabelText(/select module/i);
    fireEvent.change(select, { target: { value: modules[0].name } });
    const output = screen.getByTestId('session-output').textContent;
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    fireEvent.change(screen.getByLabelText(/reopen session/i), {
      target: { value: modules[0].name },
    });
    expect(screen.getByTestId('session-output').textContent).toBe(output);
    unmount();
    render(<TargetEmulator />);
    fireEvent.change(screen.getByLabelText(/reopen session/i), {
      target: { value: modules[0].name },
    });
    expect(screen.getByTestId('session-output').textContent).toBe(output);
  });

  it('renders sandbox snapshot data from postMessage events', async () => {
    render(<TargetEmulator />);
    const iframe = screen.getByTitle('emulated-target-browser') as HTMLIFrameElement;
    const frameWindow = {} as Window;
    Object.defineProperty(iframe, 'contentWindow', {
      value: frameWindow,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'emulator-data',
            data: {
              userAgent: 'TestAgent/1.0',
              language: 'en-US',
              timezone: 'UTC',
            },
            settings: {
              profile: 'desktop',
              profileLabel: 'Desktop preset',
              locale: 'en-US',
              timezone: 'UTC',
              colorScheme: 'light',
              features: { cookies: true, storage: false, notifications: true },
            },
          },
          source: frameWindow,
        }),
      );
    });

    expect(await screen.findByText('TestAgent/1.0')).toBeInTheDocument();
    expect(screen.getByText(/Desktop preset/)).toBeInTheDocument();
    const storageLabels = await screen.findAllByText(/Local storage available/i);
    const storageLabel = storageLabels.find((node) => node.tagName === 'DT');
    expect(storageLabel).toBeTruthy();
    const storageRow = storageLabel?.closest('div');
    expect(storageRow).toBeTruthy();
    expect(storageRow as HTMLElement).toHaveTextContent(/Disabled/i);
  });

  it('requests new snapshot data when emulator settings change', async () => {
    render(<TargetEmulator />);
    const iframe = screen.getByTitle('emulated-target-browser') as HTMLIFrameElement;
    const postMessage = jest.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage },
      configurable: true,
    });

    await waitFor(() => expect(postMessage).toHaveBeenCalled());

    postMessage.mockClear();
    fireEvent.change(screen.getByLabelText(/browser preset/i), {
      target: { value: 'mobile' },
    });

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(postMessage.mock.calls[0][0]).toMatchObject({
      type: 'collect',
      settings: expect.objectContaining({ profile: 'mobile' }),
    });

    postMessage.mockClear();
    fireEvent.click(screen.getByRole('checkbox', { name: /Notifications granted/i }));

    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(postMessage.mock.calls[0][0]).toMatchObject({
      settings: expect.objectContaining({
        features: expect.objectContaining({ notifications: false }),
      }),
    });
  });

  it('copies values and the snapshot payload to the clipboard', async () => {
    const originalClipboard = navigator.clipboard;
    const writeText = jest.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };

    render(<TargetEmulator />);
    const iframe = screen.getByTitle('emulated-target-browser') as HTMLIFrameElement;
    const frameWindow = {} as Window;
    Object.defineProperty(iframe, 'contentWindow', {
      value: frameWindow,
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'emulator-data',
            data: { userAgent: 'ClipboardAgent', language: 'en-US' },
            settings: {
              profile: 'desktop',
              profileLabel: 'Desktop',
              locale: 'en-US',
              timezone: 'UTC',
              colorScheme: 'light',
              features: { cookies: true, storage: true, notifications: true },
            },
          },
          source: frameWindow,
        }),
      );
    });

    const copyValueButton = await screen.findByRole('button', {
      name: /Copy User agent/i,
    });
    fireEvent.click(copyValueButton);
    expect(writeText).toHaveBeenCalledWith('ClipboardAgent');

    const copySnapshotButton = screen.getByRole('button', {
      name: /Copy snapshot JSON/i,
    });
    fireEvent.click(copySnapshotButton);
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(writeText.mock.calls[1][0]).toContain('ClipboardAgent');

    if (originalClipboard) {
      (navigator as any).clipboard = originalClipboard;
    } else {
      delete (navigator as any).clipboard;
    }
  });
});
