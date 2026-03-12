type Callback = (data: unknown) => void;

interface PubSub {
  publish: (topic: string, data: unknown) => void;
  subscribe: (topic: string, cb: Callback) => () => void;
}

function createPubSub(): PubSub {
  const channels = new Map<string, Set<Callback>>();
  return {
    publish(topic, data) {
      const subs = channels.get(topic);
      if (subs) subs.forEach((cb) => cb(data));
    },
    subscribe(topic, cb) {
      const existing = channels.get(topic);
      const subs = existing ?? new Set<Callback>();

      if (!existing) channels.set(topic, subs);

      subs.add(cb);
      return () => {
        const current = channels.get(topic);
        if (!current) return;

        current.delete(cb);
        if (current.size === 0) channels.delete(topic);
      };
    },
  };
}

const pubsub: PubSub = createPubSub();

declare global {
  var pubsub: PubSub | undefined;
}

if (typeof globalThis !== 'undefined') {
  globalThis.pubsub = pubsub;
}

export const publish = pubsub.publish;
export const subscribe = pubsub.subscribe;

