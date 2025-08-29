export interface LyricLine {
  time: number;
  text: string;
}

// Parse LRC formatted lyrics into timestamped lines
export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  lrc.split(/\r?\n/).forEach((line) => {
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) return;
    const matches = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\]/g);
    if (!matches) return;
    matches.forEach((m) => {
      const parts = /\[(\d+):(\d+)(?:\.(\d+))?\]/.exec(m);
      if (!parts) return;
      const min = Number(parts[1]);
      const sec = Number(parts[2]);
      const ms = parts[3] ? Number(parts[3].padEnd(3, '0')) : 0;
      const time = min * 60 + sec + ms / 1000;
      lines.push({ time, text });
    });
  });
  return lines.sort((a, b) => a.time - b.time);
}

// Fetch lyrics from LRCLib API
export async function fetchTimedLyrics(title: string): Promise<LyricLine[]> {
  try {
    const res = await fetch(
      `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !data.syncedLyrics) return [];
    return parseLRC(data.syncedLyrics as string);
  } catch {
    return [];
  }
}
