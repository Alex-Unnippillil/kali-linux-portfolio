const channel = typeof window !== 'undefined' && 'BroadcastChannel' in self
    ? new BroadcastChannel('sync')
    : null;
export const broadcastState = (state) => {
    channel?.postMessage({ type: 'state', state });
};
export const broadcastLeaderboard = (leaderboard) => {
    channel?.postMessage({ type: 'leaderboard', leaderboard });
};
export const subscribe = (handlers) => {
    if (!channel)
        return () => { };
    const listener = (event) => {
        if (event.data.type === 'state') {
            handlers.onState?.(event.data.state);
        }
        else if (event.data.type === 'leaderboard') {
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
