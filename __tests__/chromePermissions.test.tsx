import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chrome from '../components/apps/chrome';

jest.mock('html-to-image', () => ({
  toPng: jest.fn(),
}));

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: () => null,
  })),
}));

jest.mock('dompurify', () => ({
  sanitize: (html: string) => html,
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  (global as any).fetch = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
    if (typeof input === 'string' && input.includes('duckduckgo.com')) {
      return { json: async () => [] };
    }
    if (init?.method === 'HEAD') {
      return {
        headers: {
          get: () => null,
        },
      };
    }
    return {
      blob: async () => {
        throw new Error('no blob');
      },
      text: async () => '<html></html>',
      json: async () => [],
      headers: {
        get: () => null,
      },
    };
  });
  Object.defineProperty(window, 'FileReader', {
    writable: true,
    value: class {
      result: string | ArrayBuffer | null = 'data:';

      onload: ((this: unknown, ev: unknown) => unknown) | null = null;

      readAsDataURL() {
        if (this.onload) {
          this.onload.call(this, {});
        }
      }
    },
  });
});

const navigateTo = async (user: ReturnType<typeof userEvent.setup>, url: string) => {
  const input = await screen.findByRole('textbox');
  await user.clear(input);
  await user.type(input, url);
  await user.keyboard('{Enter}');
  await screen.findByTitle(url);
};

describe('Chrome site permissions', () => {
  it('updates sandbox when toggling permissions', async () => {
    const user = userEvent.setup();
    render(<Chrome />);

    await navigateTo(user, 'https://example.com');

    const initialFrame = await screen.findByTitle('https://example.com');
    expect((initialFrame.getAttribute('sandbox') || '').split(' ')).toContain('allow-scripts');

    await user.click(screen.getByRole('button', { name: /site permissions/i }));

    const scriptsSwitch = screen.getByRole('switch', { name: /scripts/i });
    await user.click(scriptsSwitch);

    await waitFor(() =>
      expect(screen.getByText(/Scripts blocked/i)).toBeInTheDocument(),
    );

    const frameAfterScriptToggle = await screen.findByTitle('https://example.com');
    const sandboxAfterScript = (frameAfterScriptToggle.getAttribute('sandbox') || '').split(' ');
    expect(sandboxAfterScript).not.toContain('allow-scripts');

    const cookiesSwitch = screen.getByRole('switch', { name: /cookies/i });
    await user.click(cookiesSwitch);

    const frameAfterCookieToggle = await screen.findByTitle('https://example.com');
    const sandboxAfterCookie = (frameAfterCookieToggle.getAttribute('sandbox') || '').split(' ');
    expect(sandboxAfterCookie).toContain('allow-same-origin');

    const stored = JSON.parse(localStorage.getItem('chrome-permissions') || '{}');
    expect(stored['https://example.com']).toMatchObject({ scripts: false, cookies: true });
  });

  it('applies stored permissions when revisiting a site', async () => {
    localStorage.setItem(
      'chrome-permissions',
      JSON.stringify({
        'https://example.com': { scripts: false, cookies: true },
      }),
    );

    const user = userEvent.setup();
    render(<Chrome />);

    await navigateTo(user, 'https://example.com');

    const frame = await screen.findByTitle('https://example.com');
    const sandboxTokens = (frame.getAttribute('sandbox') || '').split(' ');
    expect(sandboxTokens).not.toContain('allow-scripts');
    expect(sandboxTokens).toContain('allow-same-origin');
  });
});
