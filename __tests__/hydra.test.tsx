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

describe('Hydra progress', () => {
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

  it('shows fixture progress and results', async () => {
    render(<HydraApp />);
    fireEvent.change(screen.getByPlaceholderText('192.168.0.1'), {
      target: { value: '1.1.1.1' },
    });
    fireEvent.click(screen.getByText('Run Hydra'));

    await screen.findByText(/Attempts\/sec:/i);
    await screen.findByText('admin:password123', {}, { timeout: 5000 });
    expect(await screen.findByText(/Simulation only/)).toBeInTheDocument();
  });
});
