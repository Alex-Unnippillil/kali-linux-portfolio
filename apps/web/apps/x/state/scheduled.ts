import usePersistentState from '../../../hooks/usePersistentState';

export interface ScheduledTweet {
  id: string;
  text: string;
  time: number; // epoch milliseconds
}

/**
 * Persist list of scheduled tweets.
 */
export default function useScheduledTweets() {
  return usePersistentState<ScheduledTweet[]>('x-scheduled-tweets', []);
}
