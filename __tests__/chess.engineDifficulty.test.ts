import { suggestMoves } from "../games/chess/engine/wasmEngine";

describe("engine difficulty", () => {
  const fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/3P4/PPP2PPP/RNBQKBNR w KQkq - 0 3";

  test("beginner returns a wider candidate pool", () => {
    const beginner = suggestMoves(fen, 1, 1, { difficulty: "beginner" });
    expect(beginner.length).toBeGreaterThanOrEqual(2);
  });

  test("expert respects max suggestions", () => {
    const expert = suggestMoves(fen, 3, 1, { difficulty: "expert" });
    expect(expert.length).toBe(1);
  });
});
