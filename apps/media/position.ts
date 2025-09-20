export type MiniPlayerCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export const isMiniPlayerCorner = (
  value: unknown,
): value is MiniPlayerCorner =>
  value === "top-left" ||
  value === "top-right" ||
  value === "bottom-left" ||
  value === "bottom-right";

export const getNearestCorner = (
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
): MiniPlayerCorner => {
  const horizontal = x <= viewportWidth / 2 ? "left" : "right";
  const vertical = y <= viewportHeight / 2 ? "top" : "bottom";
  return `${vertical}-${horizontal}` as MiniPlayerCorner;
};
