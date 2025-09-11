import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginManager from '../components/apps/plugin-manager';

describe('PluginManager', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).URL.createObjectURL = jest.fn(() => 'blob:mock');
    (global as any).URL.revokeObjectURL = jest.fn();

    class MockWorker {
      onmessage: ((e: { data: any }) => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(_url: string) {
        setTimeout(() => {
          this.onmessage && this.onmessage({ data: 'content' });
        }, 0);
      }
      postMessage() {}
      terminate() {}
    }
    (global as any).Worker = MockWorker;

    (global as any).fetch = jest.fn((url: string) => {
      if (url === '/api/plugins') {
        return Promise.resolve({
          json: () => Promise.resolve([{ id: 'demo', file: 'demo.json' }]),
        });
      }
      if (url === '/api/plugins/demo.json') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              id: 'demo',
              sandbox: 'worker',
              code: "self.postMessage('content');",
            }),
        });
      }
      return Promise.reject(new Error('unknown url'));
    });
  });

  test('installs plugin from catalog', async () => {
    render(<PluginManager />);
    const button = await screen.findByText('Install');
    fireEvent.click(button);
    await waitFor(() =>
      expect(localStorage.getItem('installedPlugins')).toContain('sandbox')
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
      expect(localStorage.getItem('lastPluginRun')).toContain('content')
    );
    unmount();
    (global as any).URL.createObjectURL = jest.fn(() => 'blob:csv');
    (global as any).URL.revokeObjectURL = jest.fn();
    render(<PluginManager />);
    expect(await screen.findByText(/Last Run: demo/)).toBeInTheDocument();
    const exportBtn = screen.getByText('Export CSV');
    fireEvent.click(exportBtn);
    expect((global as any).URL.createObjectURL).toHaveBeenCalled();
  });

  test('exports and imports plugin config', async () => {
    render(<PluginManager />);
    const installBtn = await screen.findByText('Install');
    fireEvent.click(installBtn);
    await waitFor(() =>
      expect(localStorage.getItem('installedPlugins')).toContain('demo')
    );
    const exportBtn = screen.getByText('Export Config');
    fireEvent.click(exportBtn);
    expect((global as any).URL.createObjectURL).toHaveBeenCalled();

    const input = screen.getByTestId('import-demo');
    const file = new File(
      [JSON.stringify({ sandbox: 'iframe', extra: 'x' })],
      'cfg.json',
      { type: 'application/json' }
    );
    Object.defineProperty(input, 'files', {
      value: [file],
    });
    fireEvent.change(input);
    await waitFor(() =>
      expect(localStorage.getItem('installedPlugins')).toContain('iframe')
    );
    expect(await screen.findByText(/Import successful/)).toBeInTheDocument();
  });
});
