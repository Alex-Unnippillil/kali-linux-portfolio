import { useCallback, useMemo } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import type { Video } from './watchLater';

export const QUEUE_STORAGE_KEY = 'youtube:queue';

function isVideo(value: any): value is Video {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.thumbnail === 'string' &&
    typeof value.channelName === 'string' &&
    typeof value.channelId === 'string' &&
    (value.start === undefined || typeof value.start === 'number') &&
    (value.end === undefined || typeof value.end === 'number') &&
    (value.name === undefined || typeof value.name === 'string')
  );
}

function isVideoArray(value: unknown): value is Video[] {
  return Array.isArray(value) && value.every(isVideo);
}

export interface QueueActions {
  add(video: Video): void;
  remove(index: number): void;
  reorder(from: number, to: number): void;
  shift(): Video | undefined;
  clear(): void;
}

export default function useQueueStore(): [Video[], QueueActions] {
  const [queue, setQueue, _reset, clearStorage] = usePersistentState<Video[]>(
    QUEUE_STORAGE_KEY,
    [],
    isVideoArray,
  );

  const add = useCallback(
    (video: Video) => {
      setQueue((list) => [...list, video]);
    },
    [setQueue],
  );

  const remove = useCallback(
    (index: number) => {
      setQueue((list) => {
        if (index < 0 || index >= list.length) return list;
        const next = [...list];
        next.splice(index, 1);
        return next;
      });
    },
    [setQueue],
  );

  const reorder = useCallback(
    (from: number, to: number) => {
      setQueue((list) => {
        if (from === to || from < 0 || from >= list.length) return list;
        const maxIndex = list.length - 1;
        const target = Math.min(Math.max(to, 0), maxIndex);
        if (target === from) return list;
        const next = [...list];
        const [item] = next.splice(from, 1);
        next.splice(target, 0, item);
        return next;
      });
    },
    [setQueue],
  );

  const shift = useCallback(() => {
    let nextItem: Video | undefined;
    setQueue((list) => {
      if (!list.length) return list;
      const [first, ...rest] = list;
      nextItem = first;
      return rest;
    });
    return nextItem;
  }, [setQueue]);

  const clear = useCallback(() => {
    clearStorage();
  }, [clearStorage]);

  const actions = useMemo<QueueActions>(
    () => ({ add, remove, reorder, shift, clear }),
    [add, remove, reorder, shift, clear],
  );

  return [queue, actions];
}

