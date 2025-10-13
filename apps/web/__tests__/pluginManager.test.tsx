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
          json: () =>
            Promise.resolve([
              {
                id: 'demo',
                file: 'demo.json',
                sandbox: 'worker',
                size: 128,
                description: 'Demo plugin that echoes content.',
              },
            ]),
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

  test('installs plugin from catalog and shows metadata', async () => {
    render(<PluginManager />);
    expect(await screen.findByText(/Sandbox: Worker/i)).toBeInTheDocument();
    expect(screen.getByText(/128 B/)).toBeInTheDocument();
    const listItem = screen.getByText('demo').closest('li');
    expect(listItem).toHaveAttribute(
      'title',
      'Demo plugin that echoes content.'
    );
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
    expect(screen.getByText(/Export CSV/)).toBeInTheDocument();
    const exportBtn = screen.getByText('Export CSV');
    fireEvent.click(exportBtn);
    expect((global as any).URL.createObjectURL).toHaveBeenCalled();
  });
});
