export type BroadcastPayload = unknown;

export interface BroadcastMessage<T = BroadcastPayload> {
  type: string;
  payload: T;
}

export const BC_EVENTS = {
  theme: 'theme:change',
  dnd: 'dnd:change',
} as const;

const hasBroadcastChannel =
  typeof globalThis !== 'undefined' &&
  'BroadcastChannel' in globalThis &&
  typeof globalThis.BroadcastChannel === 'function';

const channel = hasBroadcastChannel
  ? new globalThis.BroadcastChannel('kali')
  : null;

export type Unsubscribe = () => void;

export function publish<T = BroadcastPayload>(type: string, payload: T): void {
  channel?.postMessage({ type, payload } as BroadcastMessage<T>);
}

export function subscribe<T = BroadcastPayload>(
  type: string,
  callback: (payload: T) => void,
): Unsubscribe {
  if (!channel) return () => {};

  const handler = (event: MessageEvent<BroadcastMessage<T>>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type !== type) return;
    callback(message.payload as T);
  };

  channel.addEventListener('message', handler as EventListener);
  return () => channel.removeEventListener('message', handler as EventListener);
}

export { channel };
