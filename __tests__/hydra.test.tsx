import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';
import HydraApp from '../components/apps/hydra';
import { ExperimentsProvider } from '../hooks/useExperiments';

const renderWithHydraFlag = (ui: React.ReactNode) =>
  render(
    <ExperimentsProvider loader={async () => ({ 'hydra-lab': true })}>
      {ui}
    </ExperimentsProvider>,
  );

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
    const { unmount } = renderWithHydraFlag(<HydraApp />);
    const input = await screen.findByTestId('user-file-input');
    fireEvent.change(input, {
      target: { files: [file] },
    });

    await screen.findByText('users.txt', { selector: 'li' });
    unmount();
    renderWithHydraFlag(<HydraApp />);
    const occurrences = await screen.findAllByText('users.txt');
    expect(occurrences.length).toBeGreaterThan(0);
  });
});

describe('Hydra target validation', () => {
  it('disables run button for empty or malformed targets', async () => {
    renderWithHydraFlag(<HydraApp />);
    const targetInput = await screen.findByPlaceholderText('192.168.0.1');
    const runBtn = await screen.findByText('Run Hydra');
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

    renderWithHydraFlag(<HydraApp />);
    const targetInput = await screen.findByPlaceholderText('192.168.0.1');
    fireEvent.change(targetInput, {
      target: { value: '1.1.1.1' },
    });
    const runBtn = await screen.findByText('Run Hydra');
    fireEvent.click(runBtn);

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

    const { unmount } = renderWithHydraFlag(<HydraApp />);
    const targetInput = await screen.findByPlaceholderText('192.168.0.1');
    fireEvent.change(targetInput, {
      target: { value: '1.1.1.1' },
    });
    const runBtn = await screen.findByText('Run Hydra');
    fireEvent.click(runBtn);
    expect(localStorage.getItem('hydra/session')).toBeTruthy();

    unmount();
    renderWithHydraFlag(<HydraApp />);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/hydra',
        expect.objectContaining({ body: expect.stringContaining('resume') })
      )
    );

    await act(async () => {
      runResolve();
    });
  });
});
