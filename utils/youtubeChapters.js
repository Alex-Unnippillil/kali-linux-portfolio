const TIMESTAMP_PATTERN = /\b(?:\d{1,2}:){1,2}\d{2}\b/;

export function parseTimecode(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return Number(raw);
  }

  const hmsMatch = raw.match(
    /^(?:(?<hours>\d+)\s*h(?:ours?)?\s*)?(?:(?<minutes>\d+)\s*m(?:in(?:ute)?s?)?\s*)?(?:(?<seconds>\d+)\s*s(?:ec(?:ond)?s?)?\s*)?$/i,
  );
  if (
    hmsMatch &&
    (hmsMatch.groups?.hours || hmsMatch.groups?.minutes || hmsMatch.groups?.seconds)
  ) {
    const hours = Number(hmsMatch.groups?.hours || 0);
    const minutes = Number(hmsMatch.groups?.minutes || 0);
    const seconds = Number(hmsMatch.groups?.seconds || 0);
    if ([hours, minutes, seconds].every((n) => Number.isFinite(n))) {
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  const parts = raw.split(':');
  if (parts.length >= 2 && parts.length <= 3) {
    const nums = parts.map((part) => Number(part));
    if (nums.every((n) => Number.isFinite(n))) {
      if (nums.length === 3) {
        return nums[0] * 3600 + nums[1] * 60 + nums[2];
      }
      return nums[0] * 60 + nums[1];
    }
  }

  return null;
}

function normaliseChapterEntry(entry, index) {
  if (!entry) return null;
  const title = (entry.title || entry.name || entry.label || '').trim();
  const startValue =
    entry.startTime ??
    entry.start_time ??
    entry.start ??
    entry.time ??
    entry.timestamp ??
    null;
  const startTime = parseTimecode(startValue);
  if (!Number.isFinite(startTime)) return null;
  return {
    title: title || `Chapter ${index + 1}`,
    startTime: Math.max(0, startTime),
  };
}

function parseChaptersFromArray(arr) {
  if (!Array.isArray(arr)) return [];
  const unique = new Map();
  arr.forEach((entry, idx) => {
    const parsed = normaliseChapterEntry(entry, idx);
    if (parsed && !unique.has(parsed.startTime)) {
      unique.set(parsed.startTime, parsed);
    }
  });
  return Array.from(unique.values()).sort((a, b) => a.startTime - b.startTime);
}

function parseChaptersFromText(text) {
  if (typeof text !== 'string') return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = [];
  lines.forEach((line, index) => {
    const regex = new RegExp(TIMESTAMP_PATTERN);
    const match = regex.exec(line);
    if (!match) return;
    const timestamp = match[0];
    const time = parseTimecode(timestamp);
    if (!Number.isFinite(time)) return;
    const matchIndex = match.index ?? line.indexOf(timestamp);
    const after = line
      .slice(matchIndex + timestamp.length)
      .trim()
      .replace(/^[-–—:|\s]+/, '');
    const before = line
      .slice(0, matchIndex)
      .trim()
      .replace(/^[-–—:|\s]+/, '');
    parsed.push({
      title: after || before || `Chapter ${index + 1}`,
      startTime: Math.max(0, time),
    });
  });
  return parseChaptersFromArray(parsed);
}

export function parseChapterMetadata(metadata) {
  if (metadata == null) return [];
  if (Array.isArray(metadata)) {
    return parseChaptersFromArray(metadata);
  }
  if (typeof metadata === 'string') {
    const trimmed = metadata.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return parseChapterMetadata(parsed);
    } catch {
      return parseChaptersFromText(trimmed);
    }
  }
  if (typeof metadata === 'object') {
    if (Array.isArray(metadata.chapters)) {
      return parseChaptersFromArray(metadata.chapters);
    }
    if (metadata.chapters != null) {
      return parseChapterMetadata(metadata.chapters);
    }
    return parseChaptersFromArray([metadata]);
  }
  return [];
}

export function getChapterIndexForTime(chapters, currentTime) {
  if (!Array.isArray(chapters) || chapters.length === 0) return -1;
  const safeTime = Number.isFinite(currentTime) ? currentTime : 0;
  let index = 0;
  for (let i = 0; i < chapters.length; i += 1) {
    if (safeTime >= chapters[i].startTime) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

export function getChapterActionFromKey({ key, chapters, currentTime }) {
  if (!key) return null;
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return null;
  }
  const lower = key.toLowerCase();
  if (lower === 'c') {
    return { type: 'toggle' };
  }
  if (key === '[' || key === '{') {
    const idx = getChapterIndexForTime(chapters, currentTime);
    const targetIndex = Math.max(0, idx - 1);
    return {
      type: 'seek',
      index: targetIndex,
      time: chapters[targetIndex].startTime,
    };
  }
  if (key === ']' || key === '}') {
    const idx = getChapterIndexForTime(chapters, currentTime);
    const targetIndex = Math.min(idx + 1, chapters.length - 1);
    return {
      type: 'seek',
      index: targetIndex,
      time: chapters[targetIndex].startTime,
    };
  }
  if (/^\d$/.test(key)) {
    const targetIndex = key === '0' ? chapters.length - 1 : Number(key) - 1;
    if (targetIndex >= 0 && targetIndex < chapters.length) {
      return {
        type: 'seek',
        index: targetIndex,
        time: chapters[targetIndex].startTime,
      };
    }
  }
  return null;
}

export function formatChapterTime(seconds) {
  const total = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const rounded = Math.floor(total);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  const minuteStr = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const secondStr = String(secs).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${minuteStr}:${secondStr}`;
  }
  return `${minutes}:${secondStr}`;
}

