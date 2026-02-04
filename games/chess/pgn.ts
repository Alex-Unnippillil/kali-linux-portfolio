import { Chess } from "chess.js";

export type ParsedPgnGame = {
  headers: Record<string, string>;
  moves: string[];
  raw: string;
};

export type PgnMove = {
  from: string;
  to: string;
  san: string;
  promotion?: string;
};

export type PuzzleDefinition = {
  id: string;
  title: string;
  fen: string;
  sideToMove: "w" | "b";
  solution: PgnMove[];
};

export type OpeningLine = {
  id: string;
  name: string;
  moves: PgnMove[];
};

const safeLoadPgn = (game: Chess, pgn: string): boolean => {
  if (typeof (game as Chess & { load_pgn?: (text: string) => boolean }).load_pgn === "function") {
    const result = (game as Chess & { load_pgn: (text: string) => boolean }).load_pgn(pgn);
    return typeof result === "boolean" ? result : true;
  }
  if (typeof (game as Chess & { loadPgn?: (text: string) => boolean }).loadPgn === "function") {
    const result = (game as Chess & { loadPgn: (text: string) => boolean }).loadPgn(pgn);
    return typeof result === "boolean" ? result : true;
  }
  return false;
};

const splitPgnGames = (pgn: string): string[] =>
  pgn
    .split(/\n\s*\n(?=\[)/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

const parseHeaders = (lines: string[]): Record<string, string> => {
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^\[(\w+)\s+"(.*)"\]$/);
    if (match) {
      const [, key, value] = match;
      headers[key] = value;
    }
  }
  return headers;
};

const parseMoveText = (moveText: string): string[] => {
  const cleaned = moveText
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  return cleaned.split(" ").filter(Boolean);
};

export const parsePgnGames = (pgn: string): ParsedPgnGame[] => {
  if (!pgn) return [];
  return splitPgnGames(pgn).map((chunk) => {
    const lines = chunk.split(/\r?\n/);
    const headerLines = lines.filter((line) => line.trim().startsWith("["));
    const moveLines = lines.filter((line) => !line.trim().startsWith("["));
    const headers = parseHeaders(headerLines);
    const moves = parseMoveText(moveLines.join(" "));
    return { headers, moves, raw: chunk };
  });
};

export const parsePuzzlePgn = (pgn: string): PuzzleDefinition[] =>
  parsePgnGames(pgn).flatMap((game, index) => {
    const fen = game.headers.FEN ?? new Chess().fen();
    const sideToMove = (fen.split(" ")[1] as "w" | "b") ?? "w";
    const chess = new Chess();
    const loaded = safeLoadPgn(chess, game.raw);
    if (!loaded) return [];
    const history = chess.history({ verbose: true });
    const solution = history.map((move) => ({
      from: move.from,
      to: move.to,
      san: move.san,
      promotion: move.promotion,
    }));
    const title = game.headers.Event ?? `Puzzle ${index + 1}`;
    return [
      {
        id: `puzzle-${index + 1}`,
        title,
        fen,
        sideToMove,
        solution,
      },
    ];
  });

export const parseOpeningPgn = (pgn: string): OpeningLine[] =>
  parsePgnGames(pgn).flatMap((game, index) => {
    const chess = new Chess();
    const loaded = safeLoadPgn(chess, game.raw);
    if (!loaded) return [];
    const history = chess.history({ verbose: true });
    const moves = history.map((move) => ({
      from: move.from,
      to: move.to,
      san: move.san,
      promotion: move.promotion,
    }));
    const name =
      game.headers.Opening ?? game.headers.Event ?? `Opening ${index + 1}`;
    return [{ id: `opening-${index + 1}`, name, moves }];
  });
