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

  it.each([[0, 10], [3, 3]])('preserves immediate selection %i:%i before the focus trap zero-delay retry', (start, end) => {
    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Applications menu' }));
    const input = screen.getByRole('searchbox', { name: 'Search applications' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Calculator' } });
    input.focus();
    input.setSelectionRange(start, end);
    // A visitor can select text before any scheduled autofocus callback runs.
    act(() => { jest.advanceTimersByTime(200); });
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(start);
    expect(input.selectionEnd).toBe(end);
    expect(input).toHaveValue('Calculator');
  });

  it('keeps a newly focused launcher action selected through all autofocus retries', () => {
    render(<WhiskerMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Applications menu' }));
    const action = screen.getByRole('button', { name: 'Open Terminal', exact: true });
    action.focus();
    act(() => { jest.advanceTimersByTime(200); });
    expect(action).toHaveFocus();
  });

  it('preserves a replacement selection on reopening and restores focus on close', () => {
    const { unmount } = render(<WhiskerMenu />);
    const trigger = screen.getByRole('button', { name: 'Applications menu' });
    fireEvent.click(trigger);
    let input = screen.getByRole('searchbox', { name: 'Search applications' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Calculator' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    act(() => { jest.advanceTimersByTime(200); });
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    input = screen.getByRole('searchbox', { name: 'Search applications' }) as HTMLInputElement;
    input.focus();
    input.select();
    act(() => { jest.advanceTimersByTime(200); });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(10);
    input.setRangeText('Project Gallery', input.selectionStart!, input.selectionEnd!, 'end');
    fireEvent.input(input);
    expect(input).toHaveValue('Project Gallery');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
