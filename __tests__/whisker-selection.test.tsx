import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';

describe('launcher delayed autofocus preserves editing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback =>
      window.setTimeout(() => callback(0), 0));
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(handle =>
      window.clearTimeout(handle));
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  it.each([[0, 10], [3, 3]])('preserves the active selection %i:%i through the autofocus retry', (start, end) => {
    render(<WhiskerMenu />);
    fireEvent.keyDown(window, { key: 'F1', altKey: true });
    act(() => { jest.advanceTimersByTime(20); });
    const input = screen.getByRole('searchbox', { name: 'Search applications' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Calculator' } });
    input.focus();
    input.setSelectionRange(start, end);
    expect(input).toHaveFocus();
    act(() => { jest.advanceTimersByTime(200); });
    expect(input.selectionStart).toBe(start);
    expect(input.selectionEnd).toBe(end);
    expect(input).toHaveValue('Calculator');
  });
});
