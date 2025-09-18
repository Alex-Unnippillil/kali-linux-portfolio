import { act, renderHook, waitFor } from '@testing-library/react';
import useQueueStore, {
  QUEUE_STORAGE_KEY,
} from '../../../apps/youtube/state/queueStore';
import type { Video } from '../../../apps/youtube/state/watchLater';

const makeVideo = (id: string): Video => ({
  id,
  title: `Video ${id}`,
  thumbnail: `${id}.jpg`,
  channelName: `Channel ${id}`,
  channelId: `channel-${id}`,
});

describe('youtube queue store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hydrates from localStorage', () => {
    const preset = [makeVideo('a'), makeVideo('b')];
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(preset));
    const { result } = renderHook(() => useQueueStore());

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0][0].id).toBe('a');
  });

  it('persists queue mutations', async () => {
    const hook = renderHook(() => useQueueStore());

    act(() => {
      hook.result.current[1].add(makeVideo('a'));
      hook.result.current[1].add(makeVideo('b'));
    });

    await waitFor(() => {
      expect(hook.result.current[0].map((v) => v.id)).toEqual(['a', 'b']);
    });

    act(() => {
      hook.result.current[1].reorder(0, 1);
    });

    await waitFor(() => {
      expect(hook.result.current[0].map((v) => v.id)).toEqual(['b', 'a']);
    });

    hook.unmount();

    const afterReorder = renderHook(() => useQueueStore());
    expect(afterReorder.result.current[0].map((v) => v.id)).toEqual(['b', 'a']);

    let next: Video | undefined;
    act(() => {
      next = afterReorder.result.current[1].shift();
    });
    expect(next?.id).toBe('b');

    await waitFor(() => {
      expect(afterReorder.result.current[0].map((v) => v.id)).toEqual(['a']);
    });

    afterReorder.unmount();

    const afterShift = renderHook(() => useQueueStore());
    expect(afterShift.result.current[0].map((v) => v.id)).toEqual(['a']);

    act(() => {
      afterShift.result.current[1].remove(0);
    });

    await waitFor(() => {
      expect(afterShift.result.current[0]).toHaveLength(0);
    });

    afterShift.unmount();

    expect(window.localStorage.getItem(QUEUE_STORAGE_KEY)).toBe('[]');
  });
});

