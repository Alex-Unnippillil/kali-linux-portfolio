export const RAW_LEVELS = `
; Simple tutorial level
#####
#@$.#
#####

; Two box level
######
#@ $.#
######
`;

export function parseLevels(data: string): string[][] {
  const levels: string[][] = [];
  let current: string[] = [];
  data.split(/\r?\n/).forEach((line) => {
    if (line.trim() === '' || line.trim().startsWith(';')) {
      if (current.length) {
        levels.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  });
  if (current.length) levels.push(current);
  return levels;
}

export interface LevelMeta {
  id: string;
  name: string;
  difficulty: string;
  lines: string[];
}

const defaultLevelLines = parseLevels(RAW_LEVELS);
export const defaultLevels = defaultLevelLines;
export const defaultLevelMetas: LevelMeta[] = defaultLevelLines.map((lvl, i) => ({
  id: `default-${i}`,
  name: `Level ${i + 1}`,
  difficulty: 'easy',
  lines: lvl,
}));

export async function loadPublicLevels(): Promise<LevelMeta[]> {
  try {
    const res = await fetch('/sokoban/manifest.json');
    const manifest: { id: string; file: string; name: string; difficulty: string }[] =
      await res.json();
    const levels: LevelMeta[] = [];
    for (const entry of manifest) {
      const text = await fetch(`/sokoban/${entry.file}`).then((r) => r.text());
      const parsed = parseLevels(text);
      parsed.forEach((lines, idx) => {
        levels.push({
          id: `${entry.id}-${idx}`,
          name: `${entry.name}${parsed.length > 1 ? ` ${idx + 1}` : ''}`,
          difficulty: entry.difficulty,
          lines,
        });
      });
    }
    if (levels.length) return levels;
  } catch (e) {
    console.error(e);
  }
  return defaultLevelMetas;
}
