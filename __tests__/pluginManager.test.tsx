import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PluginManager from '../components/apps/plugin-manager';
import {
  clearAllInstallSnapshots,
  resetInstallManager,
} from '../utils/installManager';

describe('PluginManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetInstallManager();
    clearAllInstallSnapshots();
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
          ok: true,
          json: () => Promise.resolve([{ id: 'demo', file: 'demo.json' }]),
        });
      }
      if (url === '/api/plugins/demo.json') {
        return Promise.resolve({
          ok: true,
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

  afterEach(() => {
    jest.useRealTimers();
  });

  test('installs plugin from catalog', async () => {
    render(<PluginManager />);
    const button = await screen.findByText('Install');
    fireEvent.click(button);
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() =>
      expect(localStorage.getItem('installedPlugins')).toContain('sandbox')
    );
    expect(await screen.findByText('Installed')).toBeInTheDocument();
  });

  test('persists last plugin run and exports CSV', async () => {
    const { unmount } = render(<PluginManager />);
    const installBtn = await screen.findByText('Install');
    fireEvent.click(installBtn);
    await act(async () => {
      jest.runAllTimers();
    });
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
});
