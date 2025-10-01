import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PluginManager from '../components/apps/plugin-manager';

describe('PluginManager iframe sandbox', () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    global.fetch = jest.fn(async (url: RequestInfo | URL) => {
      if (url === '/api/plugins') {
        return {
          json: async () => [{ id: 'iframePlugin', file: 'iframe.json' }],
        } as unknown as Response;
      }
      if (url === '/api/plugins/iframe.json') {
        return {
          json: async () => ({ id: 'iframePlugin', sandbox: 'iframe', code: '' }),
        } as unknown as Response;
      }
      throw new Error(`Unexpected fetch: ${String(url)}`);
    }) as unknown as typeof fetch;

    URL.createObjectURL = jest.fn(() => 'blob:mock');
    URL.revokeObjectURL = jest.fn();

    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName) as HTMLIFrameElement;
      if (tagName.toLowerCase() === 'iframe') {
        Object.defineProperty(element, 'contentWindow', {
          value: {},
          configurable: true,
        });
        Object.defineProperty(element, 'sandbox', {
          value: { add: jest.fn() },
          configurable: true,
        });
      }
      return element;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error restore undefined fetch
      delete global.fetch;
    }
  });

  it('only records messages from the sandboxed iframe origin', async () => {
    const user = userEvent.setup();
    render(<PluginManager />);
    const installButton = await screen.findByRole('button', { name: 'Install' });
    await user.click(installButton);
    const runButton = await screen.findByRole('button', { name: 'Run' });
    await user.click(runButton);

    const frame = document.querySelector('iframe');
    expect(frame).toBeTruthy();
    const frameWindow = (frame as HTMLIFrameElement).contentWindow as Window;

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://malicious.example',
          data: 'bad',
          source: frameWindow,
        }),
      );
    });

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'null',
          data: 'ok',
          source: frameWindow,
        }),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(await screen.findByText(/Last Run: iframePlugin/)).toBeInTheDocument();
    const output = screen.getByText((_, element) => element?.tagName === 'PRE');
    expect(output).toHaveTextContent('ok');
    expect(output).not.toHaveTextContent('bad');
  });
});

