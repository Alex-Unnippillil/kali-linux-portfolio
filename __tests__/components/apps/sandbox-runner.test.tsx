import { fireEvent, render, screen } from '@testing-library/react';
import * as sandboxManager from '@/utils/sandboxManager';
import SandboxRunner from '@/components/apps/sandbox-runner';

jest.mock('@/utils/sandboxManager', () => ({
  NETWORK_POLICIES: [
    { id: 'allow-all', label: 'Allow all traffic', description: 'Allow' },
    { id: 'block-external', label: 'Block external network', description: 'Block' },
    { id: 'isolate', label: 'Isolate (offline)', description: 'Offline' },
  ],
  startSandbox: jest.fn(),
  cleanupSandbox: jest.fn(),
  markWindowAsSandboxed: jest.fn(),
  unmarkWindowAsSandboxed: jest.fn(),
  describeNetworkPolicy: jest.fn(() => 'mock-policy'),
}));

const startSandboxMock = sandboxManager.startSandbox as jest.Mock;
const cleanupSandboxMock = sandboxManager.cleanupSandbox as jest.Mock;
const markWindowMock = sandboxManager.markWindowAsSandboxed as jest.Mock;
const unmarkWindowMock = sandboxManager.unmarkWindowAsSandboxed as jest.Mock;

describe('SandboxRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupSandboxMock.mockResolvedValue({
      sessionId: null,
      removedHomes: [],
      errors: [],
      hadStorage: false,
    });
  });

  test('allows adding custom home paths', () => {
    render(<SandboxRunner />);
    markWindowMock.mockClear();
    unmarkWindowMock.mockClear();

    const input = screen.getByLabelText(/Temporary home paths/i);
    fireEvent.change(input, { target: { value: 'lab/session-a' } });
    fireEvent.click(screen.getByRole('button', { name: /Add home/i }));

    expect(screen.getByText('lab/session-a')).toBeInTheDocument();
  });

  test('starts sandbox and displays active status', async () => {
    startSandboxMock.mockResolvedValue({
      id: 'sandbox-123',
      label: 'Research sandbox',
      homes: ['home/sandbox', 'tmp/sandbox-cache'],
      networkPolicy: 'block-external',
      createdAt: Date.now(),
      status: 'running',
    });

    render(<SandboxRunner />);
    markWindowMock.mockClear();
    unmarkWindowMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Start sandbox/i }));

    expect(startSandboxMock).toHaveBeenCalledWith({
      label: 'Research sandbox',
      homes: ['home/sandbox', 'tmp/sandbox-cache'],
      networkPolicy: 'block-external',
    });

    expect(await screen.findByText(/Active sandbox:/i)).toBeInTheDocument();
    expect(markWindowMock).toHaveBeenCalledWith('sandbox-runner');
  });

  test('cleans up sandbox storage and reports summary', async () => {
    startSandboxMock.mockResolvedValue({
      id: 'sandbox-321',
      label: 'Research sandbox',
      homes: ['home/sandbox', 'tmp/sandbox-cache'],
      networkPolicy: 'block-external',
      createdAt: Date.now(),
      status: 'running',
    });
    cleanupSandboxMock.mockResolvedValue({
      sessionId: 'sandbox-321',
      removedHomes: ['home/sandbox'],
      errors: [],
      hadStorage: true,
    });

    render(<SandboxRunner />);
    markWindowMock.mockClear();
    unmarkWindowMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Start sandbox/i }));
    await screen.findByText(/Active sandbox:/i);

    markWindowMock.mockClear();
    unmarkWindowMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Cleanup/i }));

    expect(await screen.findByText(/Removed homes: 1/)).toBeInTheDocument();
    expect(cleanupSandboxMock).toHaveBeenCalled();
    expect(unmarkWindowMock).toHaveBeenCalledWith('sandbox-runner');
  });

  test('shows error when sandbox start fails', async () => {
    startSandboxMock.mockRejectedValue(new Error('fail'));

    render(<SandboxRunner />);
    markWindowMock.mockClear();
    unmarkWindowMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Start sandbox/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to start sandbox');
  });
});

