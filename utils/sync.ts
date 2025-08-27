type StateMessage = { type: 'state'; state: unknown };
type LeaderboardMessage = { type: 'leaderboard'; leaderboard: unknown };
type SyncMessage = StateMessage | LeaderboardMessage;

const channel =
  typeof window !== 'undefined' && 'BroadcastChannel' in self
    ? new BroadcastChannel('sync')
    : null;

export const broadcastState = (state: unknown): void => {
  channel?.postMessage({ type: 'state', state } as StateMessage);
};

export const broadcastLeaderboard = (leaderboard: unknown): void => {
  channel?.postMessage({ type: 'leaderboard', leaderboard } as LeaderboardMessage);
};

export const subscribe = (
  handlers: {
    onState?: (state: unknown) => void;
    onLeaderboard?: (leaderboard: unknown) => void;
  },
): (() => void) => {
  if (!channel) return () => {};

  const listener = (event: MessageEvent<SyncMessage>) => {
    if (event.data.type === 'state') {
      handlers.onState?.(event.data.state);
    } else if (event.data.type === 'leaderboard') {
      handlers.onLeaderboard?.(event.data.leaderboard);
    }
  };

  channel.addEventListener('message', listener);
  return () => channel.removeEventListener('message', listener);
};

export default {
  broadcastState,
  broadcastLeaderboard,
  subscribe,
};
