import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DiagnosticsPanel from '../apps/settings/components/DiagnosticsPanel';
import { runSelfTest } from '../lib/selfTest';

jest.mock('../lib/selfTest');

const mockRunSelfTest = runSelfTest as jest.MockedFunction<typeof runSelfTest>;

describe('DiagnosticsPanel', () => {
  beforeEach(() => {
    mockRunSelfTest.mockReset();
    window.localStorage.clear();
  });

  it('runs the self test and shows a passing result', async () => {
    mockRunSelfTest.mockResolvedValue({
      status: 'pass',
      safeMode: false,
      appId: 'calculator',
      startedAt: 100,
      finishedAt: 150,
      totalDurationMs: 50,
      steps: [
        { id: 'open-launcher', label: 'Open launcher', status: 'pass', durationMs: 10 },
        { id: 'select-app', label: 'Select test app', status: 'pass', durationMs: 12 },
        { id: 'launch-app', label: 'Launch Calculator', status: 'pass', durationMs: 14 },
        { id: 'close-app', label: 'Close app session', status: 'pass', durationMs: 8 },
      ],
    });

    render(<DiagnosticsPanel />);

    const button = screen.getByRole('button', { name: /run self test/i });
    fireEvent.click(button);

    expect(await screen.findByText(/self test passed/i)).toBeInTheDocument();

    const trace = screen.getByRole('list', { name: /self test trace/i });
    expect(trace).toBeInTheDocument();

    await waitFor(() => {
      expect(window.localStorage.getItem('diagnostics:self-test')).toContain('"status":"pass"');
    });
  });

  it('shows failure details when the self test reports an error', async () => {
    mockRunSelfTest.mockResolvedValue({
      status: 'fail',
      safeMode: true,
      appId: 'terminal',
      startedAt: 200,
      finishedAt: 280,
      totalDurationMs: 80,
      error: 'Launch failed',
      steps: [
        { id: 'open-launcher', label: 'Open launcher', status: 'pass', durationMs: 12 },
        {
          id: 'launch-app',
          label: 'Launch Terminal',
          status: 'fail',
          durationMs: 18,
          detail: 'Timed out',
        },
      ],
    });

    render(<DiagnosticsPanel />);

    fireEvent.click(screen.getByRole('button', { name: /run self test/i }));

    expect(await screen.findByText(/self test failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Launch failed/i)).toBeInTheDocument();
    const listItems = screen.getAllByRole('listitem');
    const failureEntry = listItems.find((item) => {
      const text = item.textContent ? item.textContent.replace(/\s+/g, ' ').trim() : '';
      return text.includes('Launch Terminal') && text.includes('Fail');
    });
    expect(failureEntry).toBeTruthy();
  });
});
