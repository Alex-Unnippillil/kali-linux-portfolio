import React from 'react';
import { render, act } from '@testing-library/react';
import { useGamePersistence } from '../components/apps/useGameControls';

describe('checkers persistence helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads snapshots', () => {
    let api: ReturnType<typeof useGamePersistence> | null = null;
    const TestComponent = () => {
      api = useGamePersistence('checkers-spec');
      return null;
    };
    const { unmount } = render(<TestComponent />);
    expect(api).not.toBeNull();
    act(() => {
      api?.saveSnapshot({ board: [[{ color: 'red', king: false }]] });
    });
    const raw = localStorage.getItem('snapshot:checkers-spec');
    expect(raw).toContain('color');
    let loaded: any = null;
    act(() => {
      loaded = api?.loadSnapshot();
    });
    expect(loaded).toEqual({ board: [[{ color: 'red', king: false }]] });
    unmount();
  });

  it('only raises the high score', () => {
    let api: ReturnType<typeof useGamePersistence> | null = null;
    const TestComponent = () => {
      api = useGamePersistence('checkers-spec');
      return null;
    };
    const { unmount } = render(<TestComponent />);
    expect(api?.getHighScore()).toBe(0);
    act(() => {
      api?.setHighScore(4);
      api?.setHighScore(2);
    });
    expect(api?.getHighScore()).toBe(4);
    act(() => {
      api?.setHighScore(6);
    });
    expect(api?.getHighScore()).toBe(6);
    unmount();
  });
});
