import { createPubSub, type EventOfType, type EventPayload } from '../utils/pubsub';

export type FpsSampledEvent = {
  type: 'perf/fps-sampled';
  payload: {
    fps: number;
    frameTimeMs: number;
  };
};

export type DomainEvent = FpsSampledEvent;

export type DomainEventType = DomainEvent['type'];

export type DomainEventPayload<Type extends DomainEventType> = EventPayload<DomainEvent, Type>;

const eventBus = createPubSub<DomainEvent>();

export const publish = eventBus.publish;
export const subscribe = eventBus.subscribe;

export type Publish = typeof publish;
export type Subscribe = typeof subscribe;

declare global {
  // eslint-disable-next-line no-var
  var __domainEvents: {
    publish: Publish;
    subscribe: Subscribe;
  } | undefined;
}

if (typeof globalThis !== 'undefined') {
  globalThis.__domainEvents = {
    publish,
    subscribe,
  };
}

export type EventOfTypeWithPayload<Type extends DomainEventType> = EventOfType<DomainEvent, Type>;

