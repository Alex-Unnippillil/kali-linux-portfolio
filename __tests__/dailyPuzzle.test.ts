import { getDailyPuzzle } from "@/utils";

describe("getDailyPuzzle", () => {
  const puzzles = ["A", "B", "C"];

  test("returns same puzzle for same day", () => {
    const date = new Date("2024-01-01");
    const a = getDailyPuzzle("test", puzzles, date)!;
    const b = getDailyPuzzle("test", puzzles, date)!;
    expect(a).toBe(b);
  });

  test("returns different puzzles on different days", () => {
    const a = getDailyPuzzle("test", puzzles, new Date("2024-01-01"))!;
    const b = getDailyPuzzle("test", puzzles, new Date("2024-01-02"))!;
    expect(a).not.toBe(b);
  });

  test("returns null when no puzzles are available", () => {
    const result = getDailyPuzzle("test", []);
    expect(result).toBeNull();
  });
});
