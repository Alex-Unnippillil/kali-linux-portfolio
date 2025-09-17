import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SnapOverlay from '../components/desktop/SnapOverlay';

describe('SnapOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders layout presets with keyboard hints', () => {
    render(<SnapOverlay visible />);

    expect(screen.getByText('Halves')).toBeInTheDocument();
    expect(screen.getByText('Thirds')).toBeInTheDocument();
    expect(screen.getByText('Grid 2×2')).toBeInTheDocument();
    expect(screen.getByText('Q')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /snap to bottom right quadrant/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('dispatches a snap-region event when confirming with Enter', () => {
    const activeWindow = document.createElement('div');
    activeWindow.id = 'active-window';
    activeWindow.className = 'opened-window z-30';
    document.body.appendChild(activeWindow);

    const snapListener = jest.fn();
    activeWindow.addEventListener('snap-region', snapListener);
    const onClose = jest.fn();

    render(<SnapOverlay visible onClose={onClose} />);
    const leftHalf = screen.getByRole('button', { name: /snap to left half/i });
    leftHalf.focus();
    fireEvent.keyDown(leftHalf, { key: 'Enter' });

    expect(snapListener).toHaveBeenCalledTimes(1);
    const event = snapListener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.region).toBe('half-left');
    expect(event.detail.windowId).toBe('active-window');
    expect(onClose).toHaveBeenCalled();
  });

  it('invokes provided snapActiveWindow callback when supplied', () => {
    const snapActiveWindow = jest.fn();
    render(<SnapOverlay visible snapActiveWindow={snapActiveWindow} />);

    const rightHalf = screen.getByRole('button', { name: /snap to right half/i });
    fireEvent.click(rightHalf);

    expect(snapActiveWindow).toHaveBeenCalledWith('half-right');
  });
});
