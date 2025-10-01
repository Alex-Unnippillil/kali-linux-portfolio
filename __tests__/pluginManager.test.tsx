import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PluginManager from '../components/apps/plugin-manager';

const executeMock = jest.fn();
const disposeMock = jest.fn();

jest.mock('@/modules/extensions/bridge', () => ({
  ExtensionSandboxBridge: jest.fn().mockImplementation(() => ({
    execute: executeMock,
    dispose: disposeMock,
  })),
}));

describe('PluginManager', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).URL.createObjectURL = jest.fn(() => 'blob:mock');
    (global as any).URL.revokeObjectURL = jest.fn();

    executeMock.mockReset();
    executeMock.mockImplementation(() => ({
      cancelToken: 'token',
      cancel: jest.fn(),
      result: Promise.resolve({
        status: 'resolved',
        value: null,
        error: null,
        logs: ['content'],
        console: [],
        isolated: true,
      }),
    }));
    disposeMock.mockReset();

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
              sandbox: 'iframe',
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
    await waitFor(() => expect(executeMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(localStorage.getItem('lastPluginRun')).toContain('content')
    );
    unmount();
    expect(disposeMock).toHaveBeenCalled();
    (global as any).URL.createObjectURL = jest.fn(() => 'blob:csv');
    (global as any).URL.revokeObjectURL = jest.fn();
    render(<PluginManager />);
    expect(await screen.findByText(/Last Run: demo/)).toBeInTheDocument();
    const exportBtn = screen.getByText('Export CSV');
    fireEvent.click(exportBtn);
    expect((global as any).URL.createObjectURL).toHaveBeenCalled();
  });
});
