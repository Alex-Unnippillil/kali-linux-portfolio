import { simulateWFQSchedule } from '../components/apps/hydra/SchedulerViz';

describe('Hydra Scheduler WFQ simulation', () => {
  it('produces deterministic ordering for equal weights and seed', () => {
    const first = simulateWFQSchedule([3, 3, 3], 12345, { packetsPerFlow: 3 });
    const second = simulateWFQSchedule([3, 3, 3], 12345, { packetsPerFlow: 3 });

    expect(second).toEqual(first);
    expect(first).toMatchInlineSnapshot(`
      {
        "segments": [
          {
            "arrival": 1.275,
            "duration": 0.884,
            "finish": 2.159,
            "finishTag": 1.57,
            "flowId": 2,
            "packetIndex": 0,
            "start": 1.275,
          },
          {
            "arrival": 1.556,
            "duration": 0.891,
            "finish": 2.447,
            "finishTag": 1.867,
            "flowId": 0,
            "packetIndex": 0,
            "start": 1.556,
          },
          {
            "arrival": 2.241,
            "duration": 1.063,
            "finish": 3.304,
            "finishTag": 2.595,
            "flowId": 2,
            "packetIndex": 1,
            "start": 2.241,
          },
          {
            "arrival": 2.256,
            "duration": 1.095,
            "finish": 3.351,
            "finishTag": 2.96,
            "flowId": 1,
            "packetIndex": 0,
            "start": 2.256,
          },
          {
            "arrival": 3.137,
            "duration": 0.906,
            "finish": 4.043,
            "finishTag": 3.439,
            "flowId": 0,
            "packetIndex": 1,
            "start": 3.137,
          },
          {
            "arrival": 3.408,
            "duration": 1.168,
            "finish": 4.576,
            "finishTag": 3.828,
            "flowId": 1,
            "packetIndex": 1,
            "start": 3.408,
          },
          {
            "arrival": 3.879,
            "duration": 0.988,
            "finish": 4.867,
            "finishTag": 4.208,
            "flowId": 2,
            "packetIndex": 2,
            "start": 3.879,
          },
          {
            "arrival": 4.154,
            "duration": 0.644,
            "finish": 4.798,
            "finishTag": 4.423,
            "flowId": 0,
            "packetIndex": 2,
            "start": 4.154,
          },
          {
            "arrival": 5.077,
            "duration": 1.182,
            "finish": 6.259,
            "finishTag": 5.471,
            "flowId": 1,
            "packetIndex": 2,
            "start": 5.077,
          },
        ],
        "totalDuration": 6.259,
      }
    `);
  });

  it('biases execution toward heavier weights deterministically', () => {
    const heavy = simulateWFQSchedule([6, 2, 1], 9876, { packetsPerFlow: 4 });
    const repeat = simulateWFQSchedule([6, 2, 1], 9876, { packetsPerFlow: 4 });
    expect(repeat).toEqual(heavy);

    expect(heavy.segments.slice(0, 5)).toMatchInlineSnapshot(`
      [
        {
          "arrival": 1.117,
          "duration": 1.03,
          "finish": 2.147,
          "finishTag": 1.632,
          "flowId": 1,
          "packetIndex": 0,
          "start": 1.117,
        },
        {
          "arrival": 1.966,
          "duration": 0.983,
          "finish": 2.949,
          "finishTag": 2.13,
          "flowId": 0,
          "packetIndex": 0,
          "start": 1.966,
        },
        {
          "arrival": 2.044,
          "duration": 0.844,
          "finish": 2.888,
          "finishTag": 2.974,
          "flowId": 2,
          "packetIndex": 0,
          "start": 2.044,
        },
        {
          "arrival": 2.535,
          "duration": 0.678,
          "finish": 3.213,
          "finishTag": 3.313,
          "flowId": 1,
          "packetIndex": 1,
          "start": 2.535,
        },
        {
          "arrival": 2.794,
          "duration": 1.046,
          "finish": 3.84,
          "finishTag": 3.487,
          "flowId": 0,
          "packetIndex": 1,
          "start": 2.794,
        },
      ]
    `);
  });

  it('changes ordering when weights shift but remains reproducible for the same config', () => {
    const baselineWeights = [3, 2, 1];
    const alternativeWeights = [1, 5, 1];
    const seed = 84;
    const options = { packetsPerFlow: 5, baseSpacing: 0.2, jitter: 0.05 } as const;

    const baseline = simulateWFQSchedule(baselineWeights, seed, options);
    const alternative = simulateWFQSchedule(alternativeWeights, seed, options);
    const baselineRepeat = simulateWFQSchedule(baselineWeights, seed, options);

    expect(baselineRepeat).toEqual(baseline);
    expect(baseline.segments.map((segment) => segment.finishTag)).not.toEqual(
      alternative.segments.map((segment) => segment.finishTag)
    );
  });
});
