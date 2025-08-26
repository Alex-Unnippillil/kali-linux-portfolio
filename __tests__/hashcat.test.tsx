import { render, screen, fireEvent, act } from '@testing-library/react';
import HashcatApp from '../components/apps/hashcat';

describe('HashcatApp state persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('restores saved state on mount', () => {
    localStorage.setItem(
      'hashcatState',
      JSON.stringify({ hashType: '100', progress: 45 })
    );
    render(<HashcatApp />);
    expect(screen.getByText(/Selected: SHA1/)).toBeInTheDocument();
    expect(screen.getByText(/Progress: 45%/)).toBeInTheDocument();
  });

  test('saves state manually', () => {
    render(<HashcatApp />);
    fireEvent.change(screen.getByLabelText(/Hash Type/), {
      target: { value: '3200' },
    });
    fireEvent.click(screen.getByText(/Save State/));
    const saved = JSON.parse(localStorage.getItem('hashcatState') ?? '{}');
    expect(saved.hashType).toBe('3200');
  });
});
