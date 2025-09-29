import { act, renderHook } from '@testing-library/react';
import useUserPrefs from '../hooks/useUserPrefs';

describe('useUserPrefs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('initializes from legacy pinnedApps', () => {
    window.localStorage.setItem('pinnedApps', JSON.stringify(['app1', 'app2']));
    const { result } = renderHook(() => useUserPrefs());
    expect(result.current.dockPinnedOrder).toEqual(['app1', 'app2']);
  });

  it('persists order updates to storage', () => {
    const { result } = renderHook(() => useUserPrefs());
    act(() => {
      result.current.setDockPinnedOrder(['app2', 'app1']);
    });
    const storedPrefs = JSON.parse(
      window.localStorage.getItem('user-preferences') ?? '{}'
    );
    expect(storedPrefs.dockPinnedOrder).toEqual(['app2', 'app1']);
    expect(JSON.parse(window.localStorage.getItem('pinnedApps') ?? '[]')).toEqual([
      'app2',
      'app1',
    ]);
    expect(result.current.dockPinnedOrder).toEqual(['app2', 'app1']);
  });

  it('ensures defaults when preferences are empty', () => {
    const { result } = renderHook(() => useUserPrefs());
    act(() => {
      result.current.ensureDockPinnedApps(['app3', 'app4']);
    });
    expect(result.current.dockPinnedOrder).toEqual(['app3', 'app4']);
  });
});
