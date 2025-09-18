import React from 'react';
import {
  render,
  fireEvent,
  screen,
  act,
  within,
  waitFor,
} from '@testing-library/react';

jest.mock('../components/apps/hydra/Stepper', () => {
  const React = require('react');
  return function MockStepper() {
    return <div data-testid="mock-stepper" />;
  };
});

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

describe('Hydra stop action', () => {
  beforeEach(() => {
    localStorage.setItem(
      'hydraUserLists',
      JSON.stringify([{ name: 'u', content: 'alpha' }])
    );
    localStorage.setItem(
      'hydraPassLists',
      JSON.stringify([{ name: 'p', content: 'one' }])
    );
  });

  afterEach(() => {
    localStorage.clear();
    // @ts-ignore
    global.fetch = undefined;
  });

  it('cancels the run and logs a stop event', async () => {
    let resolveRun: Function = () => {};
    // @ts-ignore
    global.fetch = jest.fn((url, options) => {
      if (options && options.body && options.body.includes('action')) {
        return Promise.resolve({ json: async () => ({}) });
      }
      return new Promise((resolve) => {
        resolveRun = () => resolve({ json: async () => ({ output: '' }) });
      });
    });

    render(<HydraApp />);

    fireEvent.change(screen.getByPlaceholderText('192.168.0.1'), {
      target: { value: '1.1.1.1' },
    });
    fireEvent.click(screen.getByText('Run Hydra'));

    const stopBtn = await screen.findByTestId('stop-button');
    fireEvent.click(stopBtn);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/hydra',
      expect.objectContaining({
        body: JSON.stringify({ action: 'cancel' }),
      })
    );

    await screen.findByText(/Results Summary/i);
    const logTable = screen.getByRole('table', { name: /attempt log/i });
    expect(
      within(logTable).getByText(/Stopped — Run stopped by user/)
    ).toBeInTheDocument();

    await act(async () => {
      resolveRun();
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
      if (options && options.body && options.body.includes('resume')) {
        return Promise.resolve({ json: async () => ({ output: '' }) });
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

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/hydra',
      expect.objectContaining({ body: expect.stringContaining('resume') })
    );

    await act(async () => {
      runResolve();
    });
  });
});

describe('Hydra results summary', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'hydraUserLists',
      JSON.stringify([{ name: 'u', content: 'alpha' }])
    );
    localStorage.setItem(
      'hydraPassLists',
      JSON.stringify([{ name: 'p', content: 'one\ntwo\nthree' }])
    );
    localStorage.setItem(
      'hydra/session',
      JSON.stringify({
        target: '1.1.1.1',
        service: 'ssh',
        selectedUser: 'u',
        selectedPass: 'p',
        attempt: 3,
        timeline: [
          {
            attempt: 1,
            time: 0.5,
            user: 'alpha',
            password: 'one',
            status: 'failure',
            host: '1.1.1.1',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
          {
            attempt: 2,
            time: 1.2,
            user: 'alpha',
            password: 'two',
            status: 'throttled',
            host: '1.1.1.1',
            timestamp: '2024-01-01T00:00:01.000Z',
          },
          {
            attempt: 3,
            time: 2.1,
            user: 'alpha',
            password: 'three',
            status: 'lockout',
            host: '1.1.1.1',
            timestamp: '2024-01-01T00:00:02.000Z',
          },
        ],
      })
    );
    // @ts-ignore
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: async () => ({ output: '' }) })
    );
    // @ts-ignore
    window.matchMedia = window.matchMedia || function () {
      return {
        matches: false,
        addListener: () => {},
        removeListener: () => {},
      };
    };
    // @ts-ignore
    window.requestAnimationFrame = (cb: FrameRequestCallback) => cb(0);
  });

  afterEach(() => {
    localStorage.clear();
    // @ts-ignore
    global.fetch = undefined;
  });

  it('summarizes outcomes and filters the attempt log', async () => {
    render(<HydraApp />);

    await screen.findByText(/Results Summary/i);

    const summaryTable = screen.getByRole('table', { name: /attempt summary/i });
    const rows = within(summaryTable).getAllByRole('row');
    const failureRow = rows.find((row) =>
      within(row).queryByText('Failure')
    );
    const throttledRow = rows.find((row) =>
      within(row).queryByText('Throttled')
    );
    const lockoutRow = rows.find((row) =>
      within(row).queryByText('Lockout')
    );

    expect(failureRow).toBeTruthy();
    expect(throttledRow).toBeTruthy();
    expect(lockoutRow).toBeTruthy();
    expect(within(failureRow as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(throttledRow as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(lockoutRow as HTMLElement).getByText('1')).toBeInTheDocument();

    const logTable = screen.getByRole('table', { name: /attempt log/i });
    await screen.findByText('one');
    expect(within(logTable).getByText('two')).toBeInTheDocument();
    expect(within(logTable).getByText('three')).toBeInTheDocument();

    const failureCheckbox = screen.getByLabelText('Failure');
    fireEvent.click(failureCheckbox);

    await waitFor(() => {
      expect(within(logTable).queryByText('one')).not.toBeInTheDocument();
    });
    expect(within(logTable).getByText('two')).toBeInTheDocument();
    expect(within(logTable).getByText('three')).toBeInTheDocument();
  });

  it('exports the attempt log as CSV', async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalBlob = globalThis.Blob;
    let exportedBlob: Blob | undefined;

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn((blob: Blob) => {
        exportedBlob = blob;
        return 'blob:mock';
      }),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });

    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    class MockBlob {
      private parts: any[];
      constructor(parts: any[], public options?: BlobPropertyBag) {
        this.parts = parts;
      }

      async text() {
        return this.parts.map((part) => part ?? '').join('');
      }
    }

    Object.defineProperty(globalThis, 'Blob', {
      configurable: true,
      writable: true,
      value: MockBlob,
    });

    try {
      render(<HydraApp />);

      const exportButton = await screen.findByRole('button', {
        name: /export csv/i,
      });
      fireEvent.click(exportButton);

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(exportedBlob).toBeInstanceOf(MockBlob);

      const csvText = await exportedBlob!.text();
      expect(csvText).toContain('Host,User,Password,Result,Timestamp');
      expect(csvText).toContain(
        '"1.1.1.1","alpha","one","Failure","2024-01-01T00:00:00.000Z"'
      );
      expect(csvText).toContain(
        '"1.1.1.1","alpha","two","Throttled","2024-01-01T00:00:01.000Z"'
      );
      expect(csvText).toContain(
        '"1.1.1.1","alpha","three","Lockout","2024-01-01T00:00:02.000Z"'
      );
    } finally {
      clickSpy.mockRestore();
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreate,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevoke,
      });
      Object.defineProperty(globalThis, 'Blob', {
        configurable: true,
        writable: true,
        value: originalBlob,
      });
    }
  });
});
