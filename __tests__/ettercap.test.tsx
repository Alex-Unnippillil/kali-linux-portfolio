import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import Ettercap from '../components/apps/ettercap';

describe('Ettercap app', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('loads and executes plugins', () => {
    render(<Ettercap />);
    fireEvent.change(screen.getByPlaceholderText('Target 1'), { target: { value: 'a' } });
    fireEvent.change(screen.getByPlaceholderText('Target 2'), { target: { value: 'b' } });
    fireEvent.change(screen.getByPlaceholderText('Plugin code'), {
      target: { value: 'packet.protocol = "PLUGIN"; return packet;' },
    });
    fireEvent.click(screen.getByText('Load Plugin'));
    fireEvent.click(screen.getByText('Start'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('PLUGIN')).toBeInTheDocument();
  });

  it('simulates SSL stripping when enabled', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.8);
    render(<Ettercap />);
    fireEvent.change(screen.getByPlaceholderText('Target 1'), { target: { value: 'a' } });
    fireEvent.change(screen.getByPlaceholderText('Target 2'), { target: { value: 'b' } });
    fireEvent.click(screen.getByText('SSL Strip'));
    fireEvent.click(screen.getByText('Start'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('HTTP (stripped)')).toBeInTheDocument();
  });
});
