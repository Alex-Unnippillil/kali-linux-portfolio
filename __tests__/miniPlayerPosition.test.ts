import { getNearestCorner, isMiniPlayerCorner } from "../apps/media/position";

describe("mini player positioning", () => {
  test("determines nearest corner by quadrant", () => {
    expect(getNearestCorner(100, 100, 800, 600)).toBe("top-left");
    expect(getNearestCorner(700, 120, 800, 600)).toBe("top-right");
    expect(getNearestCorner(90, 580, 800, 600)).toBe("bottom-left");
    expect(getNearestCorner(790, 590, 800, 600)).toBe("bottom-right");
  });

  test("falls back to defined corners only", () => {
    expect(isMiniPlayerCorner("top-left")).toBe(true);
    expect(isMiniPlayerCorner("bottom-right")).toBe(true);
    expect(isMiniPlayerCorner("center" as unknown)).toBe(false);
  });
});
