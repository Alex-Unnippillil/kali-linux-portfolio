import { generatePuzzle } from "@/components/apps/word-search";

describe("word search generator", () => {
  test("omits diagonal placements when disabled", () => {
    const rng = () => 0.5;
    const { placements } = generatePuzzle(5, ["CAT"], rng, "ABC", false);
    const { dx, dy } = placements.CAT;
    expect(Math.abs(dx) + Math.abs(dy)).toBe(1);
  });

  test("includes diagonal placements when enabled", () => {
    const rng = () => 0.5;
    const { placements } = generatePuzzle(5, ["DOG"], rng, "ABC", true);
    const { dx, dy } = placements.DOG;
    expect(Math.abs(dx)).toBe(Math.abs(dy));
    expect(dx !== 0 && dy !== 0).toBe(true);
  });
});
