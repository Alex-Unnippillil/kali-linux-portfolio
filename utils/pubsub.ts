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
      let subs = channels.get(topic);
      if (!subs) {
        subs = new Set();
        channels.set(topic, subs);
      }
      subs.add(cb);
      return () => {
        subs!.delete(cb);
      };
    },
  };
}

const pubsub: PubSub = createPubSub();

if (typeof globalThis !== 'undefined') {
  (globalThis as any).pubsub = pubsub;
}

export const publish = pubsub.publish;
export const subscribe = pubsub.subscribe;

