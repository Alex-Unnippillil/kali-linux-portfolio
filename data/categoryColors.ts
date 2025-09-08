import type { CSSProperties } from "react";

export const categoryHues: Record<string, number> = {
  'information-gathering': 212,
  'password-attacks': 0,
};

const DEFAULT_HUE = 210;

export function getCategoryStyle(id: string): CSSProperties {
  const hue = categoryHues[id] ?? DEFAULT_HUE;
  return {
    // Light background ensures readable contrast against dark text
    backgroundColor: `hsl(${hue} 60% 90%)`,
    borderColor: `hsl(${hue} 60% 70%)`,
    color: '#000',
  };
}

export default categoryHues;
