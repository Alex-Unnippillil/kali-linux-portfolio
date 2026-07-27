import { act, renderHook } from '@testing-library/react';
import useDockStore from '../hooks/useDockStore';

describe('useDockStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists pinned order across hook lifecycles', () => {
    const storageKey = 'dock-test-storage';
    const { result, unmount } = renderHook(() =>
      useDockStore({ initialPinned: ['terminal', 'files', 'browser'], storageKey }),
    );

    expect(result.current.pinned).toEqual(['terminal', 'files', 'browser']);

    act(() => result.current.reorderPinned(0, 2));
    expect(result.current.pinned).toEqual(['files', 'browser', 'terminal']);

    unmount();

    const { result: rerendered } = renderHook(() =>
      useDockStore({ initialPinned: ['terminal', 'files', 'browser'], storageKey }),
    );

    expect(rerendered.current.pinned).toEqual(['files', 'browser', 'terminal']);
  });

  it('keeps running apps separate from pinned ones', () => {
    const storageKey = 'dock-test-running';
    const { result } = renderHook(() =>
      useDockStore({ initialPinned: ['terminal'], storageKey }),
    );

    act(() => result.current.setRunningApps(['terminal', 'notes', 'notes', 'music']));

    expect(result.current.pinned).toEqual(['terminal']);
    expect(result.current.running).toEqual(['notes', 'music']);

    act(() => result.current.unpinApp('terminal'));
    expect(result.current.pinned).toEqual([]);

    act(() => result.current.setRunningApps(['terminal', 'music']));
    expect(result.current.running).toEqual(['terminal', 'music']);
  });
});
