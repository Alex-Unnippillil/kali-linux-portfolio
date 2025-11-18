import React from 'react';
import { act, render } from '@testing-library/react';
import WindowShell from '../components/base/WindowShell';
import {
  measureWindowTopOffset,
  measureSafeAreaInset,
  measureSnapBottomInset,
} from '../utils/windowLayout';

jest.mock('../utils/windowLayout', () => {
  const actual = jest.requireActual('../utils/windowLayout');
  return {
    ...actual,
    measureWindowTopOffset: jest.fn(() => 24),
    measureSafeAreaInset: jest.fn(() => 0),
    measureSnapBottomInset: jest.fn(() => 0),
  };
});

describe('WindowShell pointer dragging', () => {
  beforeEach(() => {
    (measureWindowTopOffset as jest.Mock).mockReturnValue(24);
    (measureSafeAreaInset as jest.Mock).mockImplementation((side: string) => (side === 'bottom' ? 0 : 0));
    (measureSnapBottomInset as jest.Mock).mockReturnValue(0);
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('captures pointer, applies transform during drag, and commits final bounds', () => {
    jest.useFakeTimers();
    const commit = jest.fn();
    const requestSpy = jest.spyOn(window, 'requestAnimationFrame');

    requestSpy.mockImplementation((cb: FrameRequestCallback) => {
      const id = window.setTimeout(() => cb(performance.now()), 0);
      return id as unknown as number;
    });

    let capturedFrameProps: { ref: (node: HTMLDivElement | null) => void } | undefined;
    let capturedTitlebarProps: {
      ref: (node: HTMLDivElement | null) => void;
      onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
      onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
      onPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
      onPointerCancel?: (event: React.PointerEvent<HTMLDivElement>) => void;
    } | undefined;

    const { getByTestId } = render(
      <WindowShell onBoundsCommit={commit}>
        {({ frameProps, titlebarProps }) => {
          capturedFrameProps = frameProps;
          capturedTitlebarProps = titlebarProps;
          return (
            <div data-testid="frame" {...frameProps}>
              <div data-testid="titlebar" {...titlebarProps}>
                Title
              </div>
            </div>
          );
        }}
      </WindowShell>,
    );

    const frame = getByTestId('frame');
    const titlebar = getByTestId('titlebar') as HTMLElement & {
      setPointerCapture?: jest.Mock;
      releasePointerCapture?: jest.Mock;
    };

    frame.getBoundingClientRect = () => ({
      left: 200,
      top: 150,
      width: 400,
      height: 300,
      right: 600,
      bottom: 450,
      x: 200,
      y: 150,
      toJSON: () => {},
    });

    titlebar.setPointerCapture = jest.fn();
    titlebar.releasePointerCapture = jest.fn();

    const titlebarProps = capturedTitlebarProps!;
    act(() => {
      titlebarProps.onPointerDown?.({
        pointerId: 1,
        clientX: 220,
        clientY: 180,
        button: 0,
        pointerType: 'mouse',
        currentTarget: titlebar,
      } as unknown as React.PointerEvent<HTMLDivElement>);
      titlebarProps.onPointerMove?.({
        pointerId: 1,
        clientX: 360,
        clientY: 320,
        currentTarget: titlebar,
      } as unknown as React.PointerEvent<HTMLDivElement>);
      jest.runAllTimers();
    });

    expect(titlebar.setPointerCapture).toHaveBeenCalledWith(1);
    expect(frame.style.transform).toBe('translate(140px, 140px)');

    act(() => {
      titlebarProps.onPointerUp?.({
        pointerId: 1,
        clientX: 360,
        clientY: 320,
        currentTarget: titlebar,
      } as unknown as React.PointerEvent<HTMLDivElement>);
      jest.runAllTimers();
    });

    expect(titlebar.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(frame.style.transform).toBe('');
    expect(commit).toHaveBeenCalledWith({ left: 340, top: 290 });

    jest.useRealTimers();
    requestSpy.mockRestore();
  });

  it('releases capture and clears transform when unmounted mid-drag', () => {
    jest.useFakeTimers();
    const requestSpy = jest.spyOn(window, 'requestAnimationFrame');

    requestSpy.mockImplementation((cb: FrameRequestCallback) => {
      const id = window.setTimeout(() => cb(performance.now()), 0);
      return id as unknown as number;
    });

    let capturedFrameProps: { ref: (node: HTMLDivElement | null) => void } | undefined;
    let capturedTitlebarProps: {
      ref: (node: HTMLDivElement | null) => void;
      onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
      onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
      onPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
      onPointerCancel?: (event: React.PointerEvent<HTMLDivElement>) => void;
    } | undefined;

    const { getByTestId, unmount } = render(
      <WindowShell onBoundsCommit={jest.fn()}>
        {({ frameProps, titlebarProps }) => {
          capturedFrameProps = frameProps;
          capturedTitlebarProps = titlebarProps;
          return (
            <div data-testid="frame" {...frameProps}>
              <div data-testid="titlebar" {...titlebarProps}>
                Title
              </div>
            </div>
          );
        }}
      </WindowShell>,
    );

    const frame = getByTestId('frame');
    const titlebar = getByTestId('titlebar') as HTMLElement & {
      setPointerCapture?: jest.Mock;
      releasePointerCapture?: jest.Mock;
    };

    frame.getBoundingClientRect = () => ({
      left: 0,
      top: 100,
      width: 400,
      height: 300,
      right: 400,
      bottom: 400,
      x: 0,
      y: 100,
      toJSON: () => {},
    });

    titlebar.setPointerCapture = jest.fn();
    titlebar.releasePointerCapture = jest.fn();

    const titlebarProps = capturedTitlebarProps!;
    act(() => {
      titlebarProps.onPointerDown?.({
        pointerId: 5,
        clientX: 20,
        clientY: 120,
        button: 0,
        pointerType: 'mouse',
        currentTarget: titlebar,
      } as unknown as React.PointerEvent<HTMLDivElement>);
      titlebarProps.onPointerMove?.({
        pointerId: 5,
        clientX: 120,
        clientY: 220,
        currentTarget: titlebar,
      } as unknown as React.PointerEvent<HTMLDivElement>);
      jest.runAllTimers();
    });

    act(() => {
      unmount();
    });

    const releaseCalls = titlebar.releasePointerCapture?.mock?.calls ?? [];
    expect(releaseCalls.some(([pointerId]) => pointerId === 5)).toBe(true);
    expect(frame.style.transform).toBe('');

    jest.useRealTimers();
    requestSpy.mockRestore();
  });
});
