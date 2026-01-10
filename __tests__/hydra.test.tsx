import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';
import HydraApp from '../components/apps/hydra';

describe('Hydra wordlists', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists added wordlists in localStorage', async () => {
    class MockFileReader {
      onload: ((e: any) => void) | null = null;
      readAsText() {
        if (this.onload) this.onload({ target: { result: 'user\n' } });
      }
    }
    // @ts-ignore
    global.FileReader = MockFileReader;

    const file = new File(['user\n'], 'users.txt', { type: 'text/plain' });
    const { unmount } = render(<HydraApp />);
    fireEvent.change(screen.getByTestId('user-file-input'), {
      target: { files: [file] },
    });

    await screen.findByText('users.txt', { selector: 'li' });
    unmount();
    render(<HydraApp />);
    expect(screen.getAllByText('users.txt').length).toBeGreaterThan(0);
  });
});

describe('Hydra target validation', () => {
  it('disables run button for empty or malformed targets', () => {
    render(<HydraApp />);
    const targetInput = screen.getByPlaceholderText('192.168.0.1');
    const runBtn = screen.getByText('Run Hydra');
    expect(runBtn).toBeDisabled();

    fireEvent.change(targetInput, { target: { value: 'not a host' } });
    expect(runBtn).toBeDisabled();

    fireEvent.change(targetInput, { target: { value: '1.2.3.4' } });
    expect(runBtn).not.toBeDisabled();
  });
});

describe('Hydra pause and resume', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'hydraUserLists',
      JSON.stringify([{ name: 'u', content: 'a' }])
    );
    localStorage.setItem(
      'hydraPassLists',
      JSON.stringify([{ name: 'p', content: 'b' }])
    );
  });

  it('pauses and resumes cracking progress', async () => {
    let runResolve: Function = () => {};
    // @ts-ignore
    global.fetch = jest.fn((url, options) => {
      if (options && options.body && options.body.includes('action')) {
        return Promise.resolve({ json: async () => ({}) });
      }
      return new Promise((resolve) => {
        runResolve = () => resolve({ json: async () => ({ output: '' }) });
      });
    });

    render(<HydraApp />);
    fireEvent.change(screen.getByPlaceholderText('192.168.0.1'), {
      target: { value: '1.1.1.1' },
    });
    fireEvent.click(screen.getByText('Run Hydra'));

    const pauseBtn = await screen.findByTestId('pause-button');
    fireEvent.click(pauseBtn);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/hydra',
      expect.objectContaining({ body: JSON.stringify({ action: 'pause' }) })
    );

    const resumeBtn = await screen.findByTestId('resume-button');
    fireEvent.click(resumeBtn);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/hydra',
      expect.objectContaining({ body: JSON.stringify({ action: 'resume' }) })
    );

    await act(async () => {
      runResolve();
    });
  });
});

describe('Hydra session restore', () => {
  beforeEach(() => {
    localStorage.setItem(
      'hydraUserLists',
      JSON.stringify([{ name: 'u', content: 'a' }])
    );
    localStorage.setItem(
      'hydraPassLists',
      JSON.stringify([{ name: 'p', content: 'b' }])
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('resumes attack from saved session', async () => {
    let runResolve: Function = () => {};
    // @ts-ignore
    global.fetch = jest.fn((url, options) => {
      if (options && options.body) {
        try {
          const payload = JSON.parse(options.body as string);
          if (payload.action === 'resume') {
            return Promise.resolve({ json: async () => ({ output: '' }) });
          }
        } catch {
          // ignore malformed JSON in tests
        }
      }
      return new Promise((resolve) => {
        runResolve = () => resolve({ json: async () => ({ output: '' }) });
      });
    });

    const { unmount } = render(<HydraApp />);
    fireEvent.change(screen.getByPlaceholderText('192.168.0.1'), {
      target: { value: '1.1.1.1' },
    });
    fireEvent.click(screen.getByText('Run Hydra'));
    expect(localStorage.getItem('hydra/session')).toBeTruthy();

    unmount();
    render(<HydraApp />);

    const resumeCall = (global.fetch as jest.Mock).mock.calls.find((call) => {
      const options = call[1];
      if (!options || !options.body) return false;
      try {
        const payload = JSON.parse(options.body as string);
        return payload.action === 'resume';
      } catch {
        return false;
      }
    });

    expect(resumeCall).toBeTruthy();

    if (resumeCall) {
      const resumeOptions = resumeCall[1];
      const resumePayload = JSON.parse(resumeOptions.body as string);
      expect(resumePayload).toMatchObject({ action: 'resume' });
    }

    await act(async () => {
      runResolve();
    });
  });
});

describe('Hydra end-to-end sprays', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(
      'hydraUserLists',
      JSON.stringify([
        { name: 'usersA.txt', content: 'alice\nbob\ncarol' },
        { name: 'usersB.txt', content: 'mallory' },
      ])
    );
    localStorage.setItem(
      'hydraPassLists',
      JSON.stringify([
        { name: 'passesA.txt', content: 'password1\npassword2' },
        { name: 'passesB.txt', content: 'letmein' },
      ])
    );
    // @ts-ignore
    window.requestAnimationFrame = (cb) => {
      cb(0);
      return 0;
    };
    // @ts-ignore
    window.matchMedia = window.matchMedia || (() => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
    localStorage.clear();
  });

  it('runs sprays across services with concurrency controls and cleanup', async () => {
    const originalFetch = global.fetch;
    type Resolver = (payload?: { output?: string; error?: string }) => void;
    const runResolvers: Resolver[] = [];
    const fetchCalls: Array<{ url: string; body: any }> = [];
    // @ts-ignore
    global.fetch = jest.fn((url: string, options: any = {}) => {
      let body: any = {};
      if (options.body && typeof options.body === 'string') {
        try {
          body = JSON.parse(options.body);
        } catch {
          body = {};
        }
      }
      fetchCalls.push({ url, body });
      if (body.action) {
        return Promise.resolve({ json: async () => ({ ok: true }) });
      }
      return new Promise((resolve) => {
        const resolver: Resolver = (payload = {
          output: `Hydra output for ${body.service}`,
        }) =>
          resolve({ json: async () => payload });
        runResolvers.push(resolver);
      });
    });

    const durations: number[] = [];
    try {
      render(
        <React.Profiler
          id="Hydra"
          onRender={(_, __, actualDuration) => {
            durations.push(actualDuration);
          }}
        >
          <HydraApp />
        </React.Profiler>
      );

      const getTimelineRowCount = () =>
        document.querySelectorAll('tbody tr').length;

      const targetInput = screen.getByPlaceholderText('192.168.0.1');
      const runButton = screen.getByText('Run Hydra');

      fireEvent.change(targetInput, { target: { value: '10.0.0.1' } });
      expect(runButton).not.toBeDisabled();
      const baselineMemory = getTimelineRowCount();
      expect(baselineMemory).toBe(0);

      fireEvent.click(runButton);
      const pauseBtn = await screen.findByTestId('pause-button');

      for (let i = 0; i < 4; i += 1) {
        act(() => {
          jest.advanceTimersByTime(500);
        });
      }

      const rowsBeforePause = getTimelineRowCount();
      expect(rowsBeforePause).toBeGreaterThanOrEqual(4);

      fireEvent.click(pauseBtn);
      expect(
        fetchCalls.filter((c) => c.body.action === 'pause').length
      ).toBeGreaterThan(0);

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(getTimelineRowCount()).toBe(rowsBeforePause);

      const resumeBtn = await screen.findByTestId('resume-button');
      fireEvent.click(resumeBtn);
      expect(
        fetchCalls.filter((c) => c.body.action === 'resume').length
      ).toBeGreaterThan(0);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const resolveFirst = runResolvers.shift();
      await act(async () => {
        resolveFirst?.();
      });

      await screen.findByText('Hydra output for ssh');

      const timelineHeading = screen.getByText('Attempt Timeline');
      const timelineSection = timelineHeading.parentElement as HTMLElement;
      const timelineItems = Array.from(
        timelineSection.querySelectorAll('li')
      );
      expect(timelineItems).toHaveLength(6);
      expect(
        timelineItems.some((item) => item.textContent?.includes('throttled'))
      ).toBe(true);

      const tableRows = Array.from(document.querySelectorAll('tbody tr'));
      expect(tableRows).toHaveLength(6);

      const csv = [
        ['Host', 'User', 'Pass'],
        ...tableRows.map((row) =>
          Array.from(row.querySelectorAll('td')).map((cell) =>
            (cell.textContent || '').trim()
          )
        ),
      ]
        .map((cols) => cols.join(','))
        .join('\n');
      expect(csv).toContain('Host,User,Pass');
      expect(csv).toContain('10.0.0.1,alice,password1');
      expect(csv.split('\n')).toHaveLength(7);

      fireEvent.click(screen.getByText('FTP'));
      fireEvent.change(targetInput, { target: { value: '10.0.0.2' } });
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[1], { target: { value: 'usersB.txt' } });
      fireEvent.change(selects[2], { target: { value: 'passesB.txt' } });

      fireEvent.click(runButton);
      await screen.findByTestId('pause-button');

      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(getTimelineRowCount()).toBe(1);

      const cancelBtn = await screen.findByTestId('cancel-button');
      fireEvent.click(cancelBtn);
      expect(
        fetchCalls.filter((c) => c.body.action === 'cancel').length
      ).toBeGreaterThan(0);

      const resolveSecond = runResolvers.shift();
      await act(async () => {
        resolveSecond?.({ output: '' });
      });

      await waitFor(() => {
        expect(getTimelineRowCount()).toBeLessThanOrEqual(baselineMemory + 1);
      });
      expect(screen.queryByText('Attempt Timeline')).toBeNull();
      expect(localStorage.getItem('hydra/session')).toBeNull();

      const runCalls = fetchCalls.filter((c) => !c.body.action);
      expect(runCalls.map((c) => c.body.service)).toEqual(['ssh', 'ftp']);

      expect(durations.length).toBeGreaterThan(0);
      const maxDuration = Math.max(...durations);
      expect(maxDuration).toBeLessThan(50);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
