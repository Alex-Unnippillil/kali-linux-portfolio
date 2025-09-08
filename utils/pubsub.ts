type Callback<T> = (data: T) => void;

interface PubSub {
  publish<T>(topic: string, data: T): void;
  subscribe<T>(topic: string, cb: Callback<T>): () => void;
}

function createPubSub(): PubSub {
  const channels = new Map<string, Set<Callback<any>>>();
  return {
    publish<T>(topic: string, data: T) {
      const subs = channels.get(topic);
      if (subs) subs.forEach((cb) => (cb as Callback<T>)(data));
    },
    subscribe<T>(topic: string, cb: Callback<T>) {
      let subs = channels.get(topic);
      if (!subs) {
        subs = new Set();
        channels.set(topic, subs);
      }
      subs.add(cb as Callback<any>);
      return () => {
        subs!.delete(cb as Callback<any>);
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

