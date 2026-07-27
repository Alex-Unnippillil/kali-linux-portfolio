type EventHandler<Event extends { type: string; payload: unknown }> = (event: Event) => void;

export type EventOfType<
  Event extends { type: string; payload: unknown },
  Type extends Event['type'],
> = Extract<
  Event,
  { type: Type }
>;

export type EventPayload<
  Event extends { type: string; payload: unknown },
  Type extends Event['type'],
> = EventOfType<Event, Type> extends { payload: infer Payload }
  ? Payload
  : never;

export interface PubSub<Event extends { type: string; payload: unknown }> {
  publish: (event: Event) => void;
  subscribe: <Type extends Event['type']>(
    type: Type,
    handler: (payload: EventPayload<Event, Type>) => void,
  ) => () => void;
}

export function createPubSub<Event extends { type: string; payload: unknown }>(): PubSub<Event> {
  const channels = new Map<Event['type'], Set<EventHandler<Event>>>();

  return {
    publish(event) {
      const handlers = channels.get(event.type);
      if (!handlers) return;
      handlers.forEach((handler) => {
        handler(event);
      });
    },
    subscribe<Type extends Event['type']>(type: Type, handler: (payload: EventPayload<Event, Type>) => void) {
      let handlers = channels.get(type);
      if (!handlers) {
        handlers = new Set<EventHandler<Event>>();
        channels.set(type, handlers);
      }

      const bucket = handlers;
      const wrapped: EventHandler<Event> = (event) => {
        const typedEvent = event as EventOfType<Event, Type>;
        const payload = typedEvent.payload as EventPayload<Event, Type>;
        handler(payload);
      };

      bucket.add(wrapped);

      return () => {
        bucket.delete(wrapped);
        if (bucket.size === 0) {
          channels.delete(type);
        }
      };
    },
  };
}

