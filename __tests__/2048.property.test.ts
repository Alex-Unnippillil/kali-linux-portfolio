import fc from "fast-check";
import { slide } from "../apps/games/_2048/logic";

test("slide merges equal powers of two", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10 }), (exp) => {
      const val = 2 ** exp;
      const { row } = slide([val, val, 0, 0]);
      expect(row[0]).toBe(val * 2);
    }),
  );
});
