import usePersistentState from '../../../hooks/usePersistentState';
import { Video, validateVideoList } from './watchLater';

const QUEUE_KEY = 'youtube:queue';

export default function usePlaybackQueue() {
  return usePersistentState<Video[]>(QUEUE_KEY, [], validateVideoList);
}

