import fc from "fast-check";
import { reset, random } from "../apps/games/rng";

test("seeded RNG produces deterministic sequences", () => {
  fc.assert(
    fc.property(fc.string(), (seed) => {
      reset(seed);
      const a = [random(), random(), random()];
      reset(seed);
      const b = [random(), random(), random()];
      expect(a).toEqual(b);
    }),
  );
});
