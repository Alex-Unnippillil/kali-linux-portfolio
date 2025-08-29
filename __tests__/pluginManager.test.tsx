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

  test('persists last plugin run and exports CSV', async () => {
    const { unmount } = render(<PluginManager />);
    const installBtn = await screen.findByText('Install');
    fireEvent.click(installBtn);
    await waitFor(() =>
      expect(localStorage.getItem('installedPlugins')).toContain('demo')
    );
    const runBtn = await screen.findByText('Run');
    fireEvent.click(runBtn);
    await waitFor(() =>
      expect(localStorage.getItem('lastPluginRun')).toContain('demo')
    );
    unmount();
    (global as any).URL.createObjectURL = jest.fn();
    (global as any).URL.revokeObjectURL = jest.fn();
    render(<PluginManager />);
    expect(await screen.findByText(/Last Run: demo/)).toBeInTheDocument();
    const exportBtn = screen.getByText('Export CSV');
    fireEvent.click(exportBtn);
    expect((global as any).URL.createObjectURL).toHaveBeenCalled();
  });
});
