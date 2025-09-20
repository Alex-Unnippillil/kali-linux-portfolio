import usePersistentState from '../../../hooks/usePersistentState';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  channelId: string;
  start?: number;
  end?: number;
  name?: string;
}

const WATCH_LATER_KEY = 'youtube:watch-later';

export function isVideo(v: any): v is Video {
  return (
    v &&
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.thumbnail === 'string' &&
    typeof v.channelName === 'string' &&
    typeof v.channelId === 'string' &&
    (v.start === undefined || typeof v.start === 'number') &&
    (v.end === undefined || typeof v.end === 'number') &&
    (v.name === undefined || typeof v.name === 'string')
  );
}

export function validateVideoList(list: unknown): list is Video[] {
  return Array.isArray(list) && list.every(isVideo);
}

export default function useWatchLater() {
  return usePersistentState<Video[]>(WATCH_LATER_KEY, [], validateVideoList);
}

