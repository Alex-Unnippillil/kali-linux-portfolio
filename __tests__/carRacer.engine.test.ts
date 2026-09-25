import { createGame, getCarAABB, getObstacleAABB, stepGame } from '../games/car-racer/engine';

describe('car racer engine', () => {
  it('advances time deterministically', () => {
    const state = createGame(123, 'default');
    const dt = 1 / state.config.tickRate;
    let current = state;
    for (let i = 0; i < 120; i += 1) {
      current = stepGame(current, { throttle: true }, dt);
    }
    expect(current.tick).toBe(120);
    expect(current.timeSec).toBeCloseTo(1, 4);
    expect(current.distance).toBeGreaterThan(0);
  });

  it('records lap times when distance crosses lap boundary', () => {
    let state = createGame(1, 'default');
    state = { ...state, distance: state.config.lapDistance - 10, lapEndDistance: state.config.lapDistance };
    const dt = 0.2;
    const next = stepGame(state, { throttle: true }, dt);
    expect(next.laps).toBe(1);
    expect(next.lapTimes[0]).toBeCloseTo(dt, 4);
    expect(next.lapEndDistance).toBe(state.config.lapDistance * 2);
  });

  it('resolves collisions without teleporting through obstacles', () => {
    const state = createGame(42, 'default');
    const obstacleY = state.config.carStart.y - state.config.obstacleSize.height / 2;
    const obstacle = {
      id: 1,
      lane: 1,
      position: { x: state.config.carStart.x, y: obstacleY },
      size: { ...state.config.obstacleSize },
    };
    const overlapping = {
      ...state,
      car: {
        ...state.car,
        position: { ...state.car.position },
      },
      obstacles: [obstacle],
    };
    const next = stepGame(overlapping, {}, 1 / overlapping.config.tickRate);
    const carBox = getCarAABB(next);
    const obsBox = getObstacleAABB(next.obstacles[0]);
    expect(next.crashed).toBe(false);
    expect(carBox.right).toBeLessThanOrEqual(obsBox.left + overlapping.config.maxPenetration);
    const stillOverlapping = !(
      carBox.left >= obsBox.right ||
      carBox.right <= obsBox.left ||
      carBox.top >= obsBox.bottom ||
      carBox.bottom <= obsBox.top
    );
    expect(stillOverlapping).toBe(false);
  });
});
