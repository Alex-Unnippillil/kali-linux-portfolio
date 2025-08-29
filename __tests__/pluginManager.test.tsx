import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginManager from '../components/apps/plugin-manager';

describe('PluginManager', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).fetch = jest.fn((url: string) => {
      if (url === '/api/plugins') {
        return Promise.resolve({
          json: () => Promise.resolve([{ id: 'demo', file: 'demo.txt' }]),
        });
      }
      if (url === '/api/plugins/demo.txt') {
        return Promise.resolve({ text: () => Promise.resolve('content') });
      }
      return Promise.reject(new Error('unknown url'));
    });
  });

  test('installs plugin from catalog', async () => {
    render(<PluginManager />);
    const button = await screen.findByText('Install');
    fireEvent.click(button);
    await waitFor(() =>
      expect(localStorage.getItem('installedPlugins')).toContain('demo')
    );
    expect(button.textContent).toBe('Installed');
  });
});
