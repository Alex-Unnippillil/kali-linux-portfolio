import { extendSequence } from "../components/apps/simon";

describe("extendSequence", () => {
  test("appends a pad index without mutating the original sequence", () => {
    const original = [0, 1];
    const rng = jest.fn().mockReturnValue(0.9);
    const next = extendSequence(original, rng);
    expect(next).toEqual([0, 1, 3]);
    expect(original).toEqual([0, 1]);
    expect(rng).toHaveBeenCalledTimes(1);
  });

  test("normalises rng output to the 0-3 range", () => {
    const next = extendSequence([], () => 1.7);
    expect(next).toHaveLength(1);
    expect(next[0]).toBeGreaterThanOrEqual(0);
    expect(next[0]).toBeLessThan(4);
  });
});
