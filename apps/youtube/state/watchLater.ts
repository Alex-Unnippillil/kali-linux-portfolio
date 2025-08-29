import usePersistentState from '../../../hooks/usePersistentState';

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  channelId: string;
}

const WATCH_LATER_KEY = 'youtube:watch-later';

function isVideo(v: any): v is Video {
  return (
    v &&
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.thumbnail === 'string' &&
    typeof v.channelName === 'string' &&
    typeof v.channelId === 'string'
  );
}

function validate(list: unknown): list is Video[] {
  return Array.isArray(list) && list.every(isVideo);
}

export default function useWatchLater() {
  return usePersistentState<Video[]>(WATCH_LATER_KEY, [], validate);
}

