import { parseOpeningPgn, parsePgnGames, parsePuzzlePgn } from "../games/chess/pgn";

const puzzlePgn = `[Event "Mate in 1"]
[Site "?"]
[Date "2024.01.01"]
[White "Puzzle"]
[Black "?"]
[Result "*"]
[SetUp "1"]
[FEN "6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1"]
1. Re8# *`;

const openingPgn = `[Event "Ruy Lopez"]
[Site "?"]
[Date "2024.01.01"]
[Round "?"]
[White "A"]
[Black "B"]
[Result "*"]
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *`;

describe("PGN parsing helpers", () => {
  test("parsePgnGames extracts headers and SAN tokens", () => {
    const games = parsePgnGames(openingPgn);
    expect(games).toHaveLength(1);
    expect(games[0].headers.Event).toBe("Ruy Lopez");
    expect(games[0].moves.slice(0, 4)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  test("parsePuzzlePgn returns puzzle with solution moves", () => {
    const puzzles = parsePuzzlePgn(puzzlePgn);
    expect(puzzles).toHaveLength(1);
    expect(puzzles[0].sideToMove).toBe("w");
    expect(puzzles[0].solution[0].san).toBe("Re8#");
  });

  test("parseOpeningPgn returns opening line moves", () => {
    const openings = parseOpeningPgn(openingPgn);
    expect(openings).toHaveLength(1);
    expect(openings[0].name).toBe("Ruy Lopez");
    expect(openings[0].moves.length).toBeGreaterThan(4);
  });
});
