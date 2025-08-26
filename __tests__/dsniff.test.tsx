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
    expect(screen.getByText('No data')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Simulation'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('No data')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Simulation'));
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('applies host filter', () => {
    render(<Dsniff />);
    fireEvent.click(screen.getByLabelText('Simulation'));
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Apply host filter
    fireEvent.change(screen.getByPlaceholderText('Value'), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getAllByText(/example.com/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/test.com/)).toBeNull();
  });
});

