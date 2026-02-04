export const DEFAULT_SEARCH_OPTIONS = {
  caseSensitive: false,
  allowLargeFiles: false,
  maxFileSizeBytes: 1024 * 1024,
  skipBinary: true,
};

export function buildSearchOptions(options = {}) {
  return { ...DEFAULT_SEARCH_OPTIONS, ...options };
}

export function normalizeNeedle(query, options) {
  return options.caseSensitive ? query : query.toLowerCase();
}

export function lineMatches(line, needle, options) {
  if (options.caseSensitive) {
    return line.includes(needle);
  }
  return line.toLowerCase().includes(needle);
}

export function isBinaryContent(buffer) {
  const bytes = new Uint8Array(buffer);
  if (!bytes.length) return false;
  let suspicious = 0;
  for (const byte of bytes) {
    if (byte === 0) return true;
    if (byte < 7 || (byte > 13 && byte < 32)) {
      suspicious += 1;
    }
  }
  return suspicious / bytes.length > 0.2;
}
