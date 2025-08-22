import React from 'react';

// Simple checkpoint data for testing and lap logic
export const CHECKPOINTS = [
  { x: 0, y1: -5, y2: 5 }, // start/finish line
  { x: 30, y1: -5, y2: 5 },
  { x: 0, y1: 30, y2: 40 },
  { x: -30, y1: -5, y2: 5 },
  { x: 0, y1: -40, y2: -30 },
];

export const advanceCheckpoints = (
  prev,
  curr,
  next,
  lapLineCrossed,
  checkpoints = CHECKPOINTS
) => {
  const cp = checkpoints[next];
  let lapStarted = false;
  let lapCompleted = false;
  if (!cp) return { nextCheckpoint: next, lapLineCrossed, lapStarted, lapCompleted };
  const crossed =
    (prev.x - cp.x) * (curr.x - cp.x) <= 0 &&
    prev.y >= cp.y1 && prev.y <= cp.y2;
  if (crossed) {
    if (next === 0) {
      if (!lapLineCrossed) {
        lapStarted = true;
        lapLineCrossed = true;
      } else {
        lapCompleted = true;
        lapLineCrossed = false;
      }
      next = 1 % checkpoints.length;
    } else {
      next = (next + 1) % checkpoints.length;
    }
  }
  return { nextCheckpoint: next, lapLineCrossed, lapStarted, lapCompleted };
};

const CarRacer = () => (
  <iframe
    src="/apps/car-racer/index.html"
    title="Car Racer"
    className="w-full h-full"
    frameBorder="0"
  />
);

export default CarRacer;
