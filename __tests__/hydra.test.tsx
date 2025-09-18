import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
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

describe('Hydra service configuration validation', () => {
  it('requires HTTP form fields before allowing a run', () => {
    render(<HydraApp />);
    const serviceSelect = screen.getByDisplayValue('SSH') as HTMLSelectElement;
    fireEvent.change(serviceSelect, { target: { value: 'http-post-form' } });

    const targetInput = screen.getByPlaceholderText('192.168.0.1');
    fireEvent.change(targetInput, { target: { value: '1.2.3.4' } });

    const pathInput = screen.getByPlaceholderText('/login');
    const userFieldInput = screen.getByPlaceholderText('username');
    const passFieldInput = screen.getByPlaceholderText('password');

    fireEvent.change(pathInput, { target: { value: '' } });
    fireEvent.change(userFieldInput, { target: { value: '' } });
    fireEvent.change(passFieldInput, { target: { value: '' } });

    const runBtn = screen.getByText('Run Hydra');
    expect(runBtn).toBeDisabled();
    expect(screen.getByText('Set the login form path.')).toBeInTheDocument();
    expect(
      screen.getByText('Enter the username field name.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Enter the password field name.')
    ).toBeInTheDocument();

    fireEvent.change(pathInput, { target: { value: '/portal' } });
    fireEvent.change(userFieldInput, { target: { value: 'user' } });
    fireEvent.change(passFieldInput, { target: { value: 'pass' } });

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
