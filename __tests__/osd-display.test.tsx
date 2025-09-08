import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import OsdDisplay from '../components/osd/OsdDisplay';

jest.useFakeTimers();

describe('OsdDisplay', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  test('responds to volumechange events', () => {
    render(<OsdDisplay />);
    act(() => {
      window.dispatchEvent(new CustomEvent('volumechange', { detail: { value: 30 } }));
    });
    const progress = screen.getByTestId('progress');
    expect(progress.style.width).toBe('30%');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('responds to brightnesschange events', () => {
    render(<OsdDisplay />);
    act(() => {
      window.dispatchEvent(new CustomEvent('brightnesschange', { detail: { value: 70 } }));
    });
    const progress = screen.getByTestId('progress');
    expect(progress.style.width).toBe('70%');
  });
});

