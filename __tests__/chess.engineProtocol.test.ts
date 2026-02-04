import { createEngineRequestTracker } from "../games/chess/engine/engineProtocol";

describe("engine request tracker", () => {
  test("marks only the latest request as active", () => {
    const tracker = createEngineRequestTracker();
    const first = tracker.next();
    const second = tracker.next();
    expect(tracker.isLatest(first)).toBe(false);
    expect(tracker.isLatest(second)).toBe(true);
  });

  test("reset clears latest request", () => {
    const tracker = createEngineRequestTracker();
    const first = tracker.next();
    tracker.reset();
    expect(tracker.isLatest(first)).toBe(false);
    const next = tracker.next();
    expect(tracker.isLatest(next)).toBe(true);
  });
});
