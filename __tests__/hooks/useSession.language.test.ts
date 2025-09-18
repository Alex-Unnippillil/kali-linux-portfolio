import { act, renderHook } from '@testing-library/react';
import useSession, {
  DEFAULT_INPUT_SOURCE,
  INPUT_SOURCES,
} from '../../hooks/useSession';

describe('useSession input sources', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-input-source');
  });

  it('returns default input source when none assigned', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.getWindowInputSource('terminal')).toBe(
      DEFAULT_INPUT_SOURCE,
    );
    expect(document.documentElement.dataset.inputSource).toBe(
      DEFAULT_INPUT_SOURCE,
    );
  });

  it('stores and activates a specific input source for a window', () => {
    const { result } = renderHook(() => useSession());
    const nextSource = INPUT_SOURCES[1].id;

    act(() => {
      result.current.setWindowInputSource('terminal', nextSource);
    });

    expect(result.current.session.inputSources.terminal).toBe(nextSource);

    act(() => {
      result.current.activateWindowInputSource('terminal');
    });

    expect(result.current.session.activeInputSource).toBe(nextSource);
    expect(document.documentElement.dataset.inputSource).toBe(nextSource);
  });

  it('clears window-specific input source and falls back to default', () => {
    const { result } = renderHook(() => useSession());
    const nextSource = INPUT_SOURCES[2].id;

    act(() => {
      result.current.setWindowInputSource('editor', nextSource);
      result.current.activateWindowInputSource('editor');
    });

    expect(document.documentElement.dataset.inputSource).toBe(nextSource);

    act(() => {
      result.current.clearWindowInputSource('editor');
    });

    expect(result.current.session.inputSources.editor).toBeUndefined();
    expect(result.current.session.activeInputSource).toBe(
      DEFAULT_INPUT_SOURCE,
    );
    expect(document.documentElement.dataset.inputSource).toBe(
      DEFAULT_INPUT_SOURCE,
    );
  });
});
