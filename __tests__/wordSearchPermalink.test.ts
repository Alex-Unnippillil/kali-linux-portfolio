import { parseWordSearchPermalink } from "../components/apps/word-search";

describe("word search permalink parser", () => {
  test("parses and uppercases words", () => {
    const parsed = parseWordSearchPermalink(
      "?lang=es&words= hola , niño , inval!do "
    );

    expect(parsed.language).toBe("es");
    expect(parsed.wordsOverride).toEqual(["HOLA", "NIÑO", "INVALDO"]);
  });

  test("ignores invalid difficulty", () => {
    const parsed = parseWordSearchPermalink("?difficulty=nightmare");

    expect(parsed.difficulty).toBeUndefined();
  });

  test("respects diagonals=false", () => {
    const parsed = parseWordSearchPermalink("?diagonals=false");

    expect(parsed.diagonals).toBe(false);
  });

  test("keeps wordsOverride undefined when words missing", () => {
    const parsed = parseWordSearchPermalink("?seed=abc123");

    expect(parsed.seed).toBe("abc123");
    expect(parsed.wordsOverride).toBeUndefined();
  });
});
