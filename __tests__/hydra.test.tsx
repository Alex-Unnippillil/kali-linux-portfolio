import React from 'react';
import { render, fireEvent, screen, act, within } from '@testing-library/react';
import HydraApp from '../components/apps/hydra';

describe('Hydra wordlists', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds lab fixtures with read-only protection', () => {
    render(<HydraApp />);

    const userFixture = screen.getByTestId('user-list-lab-ssh-users.txt');
    expect(userFixture).toBeInTheDocument();
    expect(userFixture.textContent).toContain('lab fixture');
    const userRemove = within(userFixture).getByRole('button', { name: /Remove/i });
    expect(userRemove).toBeDisabled();

    const passFixture = screen.getByTestId('pass-list-lab-common-passwords.txt');
    expect(passFixture.textContent).toContain('lab fixture');
    const passRemove = within(passFixture).getByRole('button', { name: /Remove/i });
    expect(passRemove).toBeDisabled();
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

    await screen.findByTestId('user-list-users.txt');
    unmount();
    render(<HydraApp />);
    expect(screen.getByTestId('user-list-users.txt')).toBeInTheDocument();
  });
});

describe('Hydra target validation', () => {
  it('requires lab mode and a valid target before running', async () => {
    render(<HydraApp />);
    const targetInput = screen.getByPlaceholderText('192.168.0.1');
    const runBtn = screen.getByText('Run Hydra');
    expect(runBtn).toBeDisabled();

    fireEvent.change(targetInput, { target: { value: 'not a host' } });
    expect(runBtn).toBeDisabled();

    fireEvent.change(targetInput, { target: { value: '1.2.3.4' } });
    // still disabled because lab mode off
    expect(runBtn).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Enable lab mode'));
    fireEvent.change(screen.getByLabelText('User List'), {
      target: { value: 'lab-ssh-users.txt' },
    });
    fireEvent.change(screen.getByLabelText('Password List'), {
      target: { value: 'lab-common-passwords.txt' },
    });

    await screen.findByTestId('hydra-command-preview');
    expect(runBtn).not.toBeDisabled();
  });
});

describe('Hydra dry run output', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a command preview without executing hydra', () => {
    render(<HydraApp />);
    fireEvent.change(screen.getByPlaceholderText('192.168.0.1'), {
      target: { value: '10.0.0.1' },
    });
    fireEvent.change(screen.getByLabelText('User List'), {
      target: { value: 'lab-ssh-users.txt' },
    });
    fireEvent.change(screen.getByLabelText('Password List'), {
      target: { value: 'lab-common-passwords.txt' },
    });

    const preview = screen.getByTestId('hydra-command-preview');
    expect(preview.textContent).toContain(
      'hydra -L lab-ssh-users.txt -P lab-common-passwords.txt ssh://10.0.0.1'
    );

    fireEvent.click(screen.getByText('Dry Run'));

    expect(
      screen.getByText(
        /Lab mode disabled – this stays offline as a rehearsal./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Dry run only - no network requests made./i)
    ).toBeInTheDocument();
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
    localStorage.setItem('hydra:labMode', JSON.stringify(true));
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
    localStorage.setItem('hydra:labMode', JSON.stringify(true));
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
