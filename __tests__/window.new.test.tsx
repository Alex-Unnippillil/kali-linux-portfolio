import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Window from '../components/window/Window';

jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Window snap interactions', () => {
  it('shows snap preview near left edge and snaps on stop', () => {
    jest.useFakeTimers();
    const ref = React.createRef<any>();
    render(
      <Window ref={ref}>
        <div>content</div>
      </Window>
    );

    const winEl = screen.getByText('content').parentElement as HTMLElement;
    // simulate being near left edge
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 100,
      right: 105,
      bottom: 200,
      width: 100,
      height: 100,
      x: 5,
      y: 100,
      toJSON: () => {}
    } as any);

    act(() => {
      ref.current.handleDrag();
      jest.runAllTimers();
    });
    expect(screen.getByTestId('snap-preview')).toBeInTheDocument();

    act(() => {
      ref.current.handleStop();
    });
    expect(winEl.style.width).toBe('50%');
    expect(winEl.style.height).toBe('100%');
    jest.useRealTimers();
  });

  it('snaps right with Alt+ArrowRight', () => {
    const ref = React.createRef<any>();
    render(
      <Window ref={ref}>
        <div>content</div>
      </Window>
    );

    const winEl = screen.getByText('content').parentElement as HTMLElement;
    act(() => {
      ref.current.handleKeyDown({ key: 'ArrowRight', altKey: true, preventDefault() {}, stopPropagation() {} });
    });

    expect(winEl.style.width).toBe('50%');
    expect(winEl.style.height).toBe('100%');
  });

  it('maximizes with Alt+ArrowUp', () => {
    const ref = React.createRef<any>();
    render(
      <Window ref={ref}>
        <div>content</div>
      </Window>
    );

    const winEl = screen.getByText('content').parentElement as HTMLElement;
    act(() => {
      ref.current.handleKeyDown({ key: 'ArrowUp', altKey: true, preventDefault() {}, stopPropagation() {} });
    });

    expect(winEl.style.width).toBe('100%');
    expect(winEl.style.height).toBe('96.3%');
  });
});
