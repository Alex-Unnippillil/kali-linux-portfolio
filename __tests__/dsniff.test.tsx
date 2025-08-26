import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import Dsniff from '../components/apps/dsniff';

describe('Dsniff component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest
      .fn()
      .mockResolvedValue({ text: () => Promise.resolve('') }) as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('toggles simulation mode', () => {
    render(<Dsniff />);
    expect(screen.getAllByRole('row').length).toBe(3);

    fireEvent.click(screen.getByLabelText('Simulation'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getAllByRole('row').length).toBe(2);

    fireEvent.click(screen.getByLabelText('Simulation'));
    expect(screen.getAllByRole('row').length).toBe(3);
  });

  it('applies host filter', () => {
    render(<Dsniff />);

    fireEvent.change(screen.getByPlaceholderText('Value'), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getAllByText(/example.com/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/files.test/)).toBeNull();
  });
});

