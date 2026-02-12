import { Chess } from "chess.js";

describe("chess rule coverage", () => {
  test("all pieces have legal move generation", () => {
    const game = new Chess("4k3/8/8/3q4/2B5/3N4/R3P3/3QK2R w K - 0 1");

    expect(game.moves({ square: "e2" })).toEqual(expect.arrayContaining(["e3", "e4"])); // pawn
    expect(game.moves({ square: "d3" }).length).toBeGreaterThan(0); // knight
    expect(game.moves({ square: "c4" }).length).toBeGreaterThan(0); // bishop
    expect(game.moves({ square: "a2" }).length).toBeGreaterThan(0); // rook
    expect(game.moves({ square: "d1" }).length).toBeGreaterThan(0); // queen
    expect(game.moves({ square: "e1" }).some((move) => move.includes("O-O"))).toBe(true); // king castling
  });

  test("en passant capture is legal when available", () => {
    const game = new Chess();
    game.move("e4");
    game.move("a5");
    game.move("e5");
    game.move("d5");

    const legal = game.moves({ square: "e5" });
    expect(legal).toContain("exd6");
    game.move("exd6");
    expect(game.get("d5")).toBeUndefined();
  });

  test("promotion choices are generated", () => {
    const game = new Chess("4k3/6P1/8/8/8/8/8/4K3 w - - 0 1");
    const legal = game.moves({ square: "g7", verbose: true });
    const promotions = legal.filter((m) => m.to === "g8").map((m) => m.promotion).sort();
    expect(promotions).toEqual(["b", "n", "q", "r"]);
  });

  test("checkmate ends the game", () => {
    const game = new Chess();
    game.move("f3");
    game.move("e5");
    game.move("g4");
    game.move("Qh4#");

    expect(game.isCheckmate()).toBe(true);
    expect(game.isGameOver()).toBe(true);
  });

  test("stalemate ends as draw", () => {
    const game = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(game.isStalemate()).toBe(true);
    expect(game.isDraw()).toBe(true);
  });
});
