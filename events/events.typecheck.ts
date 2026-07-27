import { publish, subscribe } from '.';

publish({
  type: 'perf/fps-sampled',
  payload: {
    fps: 60,
    frameTimeMs: 16.67,
  },
});

subscribe('perf/fps-sampled', (payload) => {
  const fps: number = payload.fps;
  const frameTime: number = payload.frameTimeMs;
  fps.toFixed(2);
  frameTime.toFixed(2);
});

const invalidTypeEvent = {
  type: 'perf/unknown',
  payload: {
    fps: 60,
    frameTimeMs: 16.67,
  },
} as const;

const invalidTypePublish = () => {
  // @ts-expect-error - event type must exist in DomainEvent
  publish(invalidTypeEvent);
};

const missingFrameTimeEvent = {
  type: 'perf/fps-sampled',
  payload: {
    fps: 60,
  },
} as const;

const missingFrameTimePublish = () => {
  // @ts-expect-error - payload must include frameTimeMs
  publish(missingFrameTimeEvent);
};

const invalidPayloadEvent = {
  type: 'perf/fps-sampled',
  payload: {
    fps: 'fast',
    frameTimeMs: 16,
  },
} as const;

const invalidPayloadPublish = () => {
  // @ts-expect-error - payload types must match DomainEvent definition
  publish(invalidPayloadEvent);
};

void invalidTypePublish;
void missingFrameTimePublish;
void invalidPayloadPublish;

subscribe('perf/fps-sampled', (payload) => {
  payload.fps.toFixed(0);
  payload.frameTimeMs.toFixed(2);
  // @ts-expect-error - payload should not expose arbitrary properties
  payload.nonexistent;
});

// @ts-expect-error - cannot subscribe to unknown event topics
subscribe('perf/unknown', () => {});

