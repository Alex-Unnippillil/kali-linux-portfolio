import { suggestMoves } from "../games/chess/engine/wasmEngine";

describe("opening book", () => {
  test("starting position uses book moves", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const moves = suggestMoves(fen, 2, 4);
    expect(moves.map((m) => m.san)).toEqual(["e4", "d4", "c4", "Nf3"]);
  });

  test("after 1.e4 uses book responses", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const moves = suggestMoves(fen, 2, 4);
    expect(moves.map((m) => m.san)).toEqual(["c5", "e5", "e6", "c6"]);
  });
});
