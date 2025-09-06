import React, { act } from 'react';
import { render } from '@testing-library/react';
import Window from '../components/base/window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

describe('Window Super+Arrow snap', () => {
  it('restores previous position when unsnapped', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.style.transform = 'translate(150px,160px)';
    winEl.getBoundingClientRect = () => ({
      left: 150,
      top: 192,
      right: 350,
      bottom: 292,
      width: 200,
      height: 100,
      x: 150,
      y: 192,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleSuperArrow({ detail: 'ArrowLeft' } as any);
    });

    expect(ref.current!.state.snapped).toBe('left');

    act(() => {
      ref.current!.handleSuperArrow({ detail: 'ArrowDown' } as any);
    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(winEl.style.transform).toBe('translate(150px,160px)');
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });
});
