import { advanceCheckpoints, CHECKPOINTS } from '../components/apps/car-racer';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

describe('car racer checkpoints', () => {
  test('checkpoint order enforced', () => {
    let next = 0;
    let lapLineCrossed = false;
    let res = advanceCheckpoints(
      { x: CHECKPOINTS[0].x - 1, y: CHECKPOINTS[0].y1 + 1 },
      { x: CHECKPOINTS[0].x + 1, y: CHECKPOINTS[0].y1 + 1 },
      next,
      lapLineCrossed,
      CHECKPOINTS
    );
    next = res.nextCheckpoint;
    lapLineCrossed = res.lapLineCrossed;
    expect(res.lapStarted).toBe(true);
    expect(next).toBe(1);
    res = advanceCheckpoints(
      { x: CHECKPOINTS[2].x - 1, y: CHECKPOINTS[2].y1 + 1 },
      { x: CHECKPOINTS[2].x + 1, y: CHECKPOINTS[2].y1 + 1 },
      next,
      lapLineCrossed,
      CHECKPOINTS
    );
    expect(res.nextCheckpoint).toBe(1);
  });

  test('lap line counts only once per lap', () => {
    let next = 0;
    let lapLineCrossed = false;
    let res = advanceCheckpoints(
      { x: CHECKPOINTS[0].x - 1, y: CHECKPOINTS[0].y1 + 1 },
      { x: CHECKPOINTS[0].x + 1, y: CHECKPOINTS[0].y1 + 1 },
      next,
      lapLineCrossed,
      CHECKPOINTS
    );
    next = res.nextCheckpoint;
    lapLineCrossed = res.lapLineCrossed;
    res = advanceCheckpoints(
      { x: CHECKPOINTS[0].x - 1, y: CHECKPOINTS[0].y1 + 1 },
      { x: CHECKPOINTS[0].x + 1, y: CHECKPOINTS[0].y1 + 1 },
      next,
      lapLineCrossed,
      CHECKPOINTS
    );
    expect(res.lapCompleted).toBe(false);
    expect(res.lapStarted).toBe(false);
    expect(res.nextCheckpoint).toBe(1);
  });
});
