import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginManager from '../components/apps/plugin-manager';

describe('PluginManager', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).fetch = jest.fn((url: string) => {
      if (url === '/api/plugins') {
        return Promise.resolve({
          json: () =>
            Promise.resolve([
              { id: 'demo', file: 'demo.txt' },
              { id: 'alpha', file: 'alpha.txt' },
            ]),
        });
      }
      if (url.startsWith('/api/plugins/')) {
        return Promise.resolve({ text: () => Promise.resolve('content') });
      }
      return Promise.reject(new Error('unknown url'));
    });
  });

  test('filters plugins by search query', async () => {
    render(<PluginManager />);
    await screen.findByText('demo');
    await screen.findByText('alpha');
    const input = screen.getByPlaceholderText('Search plugins');
    fireEvent.change(input, { target: { value: 'dem' } });
    await waitFor(() => {
      expect(screen.queryByText('alpha')).toBeNull();
    });
  });

  test('installs, toggles, and uninstalls with persistence', async () => {
    const { unmount } = render(<PluginManager />);
    const installButton = await screen.findAllByText('Install');
    fireEvent.click(installButton[0]);
    await waitFor(() =>
      expect(localStorage.getItem('installedPlugins')).toContain('demo')
    );
    const disableBtn = await screen.findByText('Disable');
    fireEvent.click(disableBtn);
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('enabledPlugins') || '{}').demo).toBe(
        false
      )
    );
    unmount();
    render(<PluginManager />);
    const enableBtn = await screen.findByText('Enable');
    fireEvent.click(enableBtn);
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('enabledPlugins') || '{}').demo).toBe(
        true
      )
    );
    const uninstallBtn = await screen.findByText('Uninstall');
    fireEvent.click(uninstallBtn);
    await waitFor(() =>
      expect(localStorage.getItem('installedPlugins')).not.toContain('demo')
    );
  });
});
