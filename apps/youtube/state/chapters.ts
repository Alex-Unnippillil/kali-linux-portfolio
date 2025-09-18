const DEFAULT_SHORTCUTS = [
  { key: '1', code: 'Digit1', label: '1' },
  { key: '2', code: 'Digit2', label: '2' },
  { key: '3', code: 'Digit3', label: '3' },
  { key: '4', code: 'Digit4', label: '4' },
  { key: '5', code: 'Digit5', label: '5' },
  { key: '6', code: 'Digit6', label: '6' },
  { key: '7', code: 'Digit7', label: '7' },
  { key: '8', code: 'Digit8', label: '8' },
  { key: '9', code: 'Digit9', label: '9' },
  { key: '0', code: 'Digit0', label: '0' },
] as const;

interface NormalizedChapter {
  start: number;
  title?: string;
  key?: string | null;
  code?: string | null;
  label?: string | null;
}

export interface Chapter {
  index: number;
  title: string;
  start: number;
  end: number | null;
  startLabel: string;
  key: string | null;
  code: string | null;
  shortcutLabel: string | null;
}

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const minuteStr = minutes.toString().padStart(hours > 0 ? 2 : 1, '0');
  const secondStr = secs.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${minuteStr}:${secondStr}`;
  }
  return `${minuteStr.padStart(2, '0')}:${secondStr}`;
}

function parseTimecode(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Math.max(0, Number(trimmed));
  }
  if (!trimmed.includes(':')) return null;
  const parts = trimmed.split(':');
  let multiplier = 1;
  let total = 0;
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i].trim();
    if (part === '') return null;
    const numeric = Number(part);
    if (Number.isNaN(numeric)) return null;
    total += numeric * multiplier;
    multiplier *= 60;
  }
  return Math.max(0, total);
}

function parseLine(line: string): NormalizedChapter | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^((?:\d{1,2}:){1,3}\d{1,2}(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, timecode, rest] = match;
  const start = parseTimecode(timecode);
  if (start === null) return null;
  let title = rest.trim();
  title = title.replace(/^[\-–—\u2014\u2022\|>\s]+/, '');
  return { start, title: title || undefined };
}

function normalizeHotkey(
  value: unknown,
): Pick<NormalizedChapter, 'key' | 'code' | 'label'> | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^Digit\d$/.test(trimmed)) {
    const digit = trimmed.slice(5);
    return { key: digit, code: trimmed, label: digit };
  }
  if (/^Numpad\d$/.test(trimmed)) {
    const digit = trimmed.slice(6);
    return { key: digit, code: trimmed, label: digit };
  }
  if (/^Key[A-Za-z]$/.test(trimmed)) {
    const letter = trimmed.slice(3);
    return {
      key: letter.toLowerCase(),
      code: trimmed,
      label: letter.toUpperCase(),
    };
  }
  if (/^\d$/.test(trimmed)) {
    return {
      key: trimmed,
      code: `Digit${trimmed}`,
      label: trimmed,
    };
  }
  if (trimmed.length === 1) {
    return {
      key: trimmed.toLowerCase(),
      label: trimmed.toUpperCase(),
    };
  }
  return {
    key: trimmed.toLowerCase(),
    label: trimmed,
  };
}

function parseArray(entries: any[]): NormalizedChapter[] {
  const normalized: NormalizedChapter[] = [];
  for (const item of entries) {
    if (!item) continue;
    if (typeof item === 'string') {
      const result = parseLine(item);
      if (result) normalized.push(result);
      continue;
    }
    if (Array.isArray(item)) {
      const [time, title] = item;
      const start = parseTimecode(time);
      if (start === null) continue;
      normalized.push({
        start,
        title: typeof title === 'string' ? title : undefined,
      });
      continue;
    }
    if (typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      if (Array.isArray(obj.chapters)) {
        normalized.push(...parseArray(obj.chapters));
        continue;
      }
      const start =
        parseTimecode(
          obj.start ??
            obj.start_time ??
            obj.startTime ??
            obj.time ??
            obj.timestamp ??
            obj.at ??
            obj.offset ??
            obj.seconds ??
            obj.t,
        );
      if (start === null) continue;
      const titleCandidate =
        obj.title ?? obj.name ?? obj.label ?? obj.text ?? obj.chapter_title;
      const hotkeyCandidate =
        obj.shortcut ?? obj.hotkey ?? obj.key ?? obj.code ?? obj.shortcutKey;
      const hotkey = normalizeHotkey(hotkeyCandidate);
      normalized.push({
        start,
        title: typeof titleCandidate === 'string' ? titleCandidate : undefined,
        key: hotkey?.key ?? null,
        code: hotkey?.code ??
          (typeof obj.code === 'string' ? obj.code : null),
        label: hotkey?.label ?? null,
      });
    }
  }
  return normalized;
}

function parseObject(source: Record<string, unknown>): NormalizedChapter[] {
  if (Array.isArray(source.chapters)) {
    return parseArray(source.chapters);
  }
  if (typeof source.chapters === 'string') {
    const nested = parseString(source.chapters);
    if (nested.length) return nested;
  }
  if (Array.isArray(source.items)) {
    return parseArray(source.items);
  }
  if ('title' in source && ('start' in source || 'start_time' in source)) {
    return parseArray([source]);
  }
  return [];
}

function parseString(value: string): NormalizedChapter[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const normalized = parseSource(parsed);
      if (normalized.length) return normalized;
    } catch {
      // fall through to plain text parsing
    }
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => parseLine(line))
    .filter((item): item is NormalizedChapter => Boolean(item));
}

function parseSource(source: unknown): NormalizedChapter[] {
  if (!source) return [];
  if (Array.isArray(source)) {
    return parseArray(source);
  }
  if (typeof source === 'string') {
    return parseString(source);
  }
  if (typeof source === 'object') {
    return parseObject(source as Record<string, unknown>);
  }
  return [];
}

export function parseChapters(source: unknown): Chapter[] {
  const normalized = parseSource(source);
  if (!normalized.length) return [];
  const sorted = normalized
    .filter((item) => Number.isFinite(item.start))
    .map((item) => ({
      start: Math.max(0, item.start),
      title: item.title,
      key: item.key ?? null,
      code: item.code ?? null,
      label: item.label ?? null,
    }))
    .sort((a, b) => a.start - b.start);

  const unique: NormalizedChapter[] = [];
  for (const item of sorted) {
    const last = unique[unique.length - 1];
    if (last && Math.abs(last.start - item.start) < 0.25) {
      if (!last.title && item.title) {
        last.title = item.title;
      }
      if (!last.key && item.key) {
        last.key = item.key;
      }
      if (!last.code && item.code) {
        last.code = item.code;
      }
      if (!last.label && item.label) {
        last.label = item.label;
      }
      continue;
    }
    unique.push({ ...item });
  }

  return unique.map((item, index) => {
    let key = item.key ?? null;
    let code = item.code ?? null;
    let label = item.label ?? null;
    if (!key && code) {
      if (/^Digit\d$/.test(code)) {
        key = code.slice(5);
        label = label ?? key;
      } else if (/^Key[A-Za-z]$/.test(code)) {
        const letter = code.slice(3);
        key = letter.toLowerCase();
        label = label ?? letter.toUpperCase();
      }
    }
    if (!key && label && label.length === 1) {
      key = label.toLowerCase();
    }
    if (!label && key && key.length === 1) {
      label = key.toUpperCase();
    }
    if (!key && !code && !label && index < DEFAULT_SHORTCUTS.length) {
      const shortcut = DEFAULT_SHORTCUTS[index];
      key = shortcut.key;
      code = shortcut.code;
      label = shortcut.label;
    } else if (!label && index < DEFAULT_SHORTCUTS.length && key === DEFAULT_SHORTCUTS[index].key) {
      label = DEFAULT_SHORTCUTS[index].label;
    }
    return {
      index,
      title: (item.title ?? `Chapter ${index + 1}`).trim(),
      start: item.start,
      end: unique[index + 1]?.start ?? null,
      startLabel: formatTimestamp(item.start),
      key,
      code,
      shortcutLabel: label,
    };
  });
}

export function getActiveChapterIndex(
  time: number,
  chapters: Chapter[],
): number {
  if (!Number.isFinite(time) || !chapters.length) return -1;
  const safeTime = Math.max(0, time);
  for (let i = 0; i < chapters.length; i += 1) {
    const chapter = chapters[i];
    const nextStart = chapters[i + 1]?.start ?? Number.POSITIVE_INFINITY;
    if (safeTime + 0.15 < chapter.start) {
      continue;
    }
    if (safeTime < nextStart) {
      return i;
    }
  }
  return chapters.length - 1;
}

export function seekToChapter(
  player: { seekTo?: (time: number, allowSeekAhead?: boolean) => void } | null,
  chapter: Chapter,
  withinMs = 100,
): void {
  if (!player || typeof player.seekTo !== 'function') return;
  const delay = Math.min(Math.max(withinMs, 0), 100);
  const target = chapter.start;
  try {
    player.seekTo(target, true);
  } catch {
    // ignore errors from seek attempts
  }
  if (typeof window === 'undefined' || delay === 0) return;
  const fallbackDelay = Math.min(75, delay);
  window.setTimeout(() => {
    try {
      player.seekTo?.(target, true);
    } catch {
      // ignore errors from seek attempts
    }
  }, fallbackDelay);
}

export { formatTimestamp };
