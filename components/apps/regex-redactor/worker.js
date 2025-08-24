import { diffWords } from 'diff';
import safeRegex from 'safe-regex';
import { PRESETS } from './presets';

self.onmessage = (e) => {
  const { text, pattern, preset, mask } = e.data;
  let error = '';
  let unsafe = false;
  let redacted = text;
  const highlights = [];
  let diff = [];

  if (pattern) {
    unsafe = !safeRegex(pattern);
    let regex;
    try {
      regex = new RegExp(pattern, 'g');
    } catch (err) {
      error = err.message;
    }
    if (regex) {
      redacted = text.replace(regex, (match, offset) => {
        highlights.push({ start: offset, end: offset + match.length });
        const p = PRESETS.find((p) => p.label === preset);
        if (p && typeof p.mask === 'function') return p.mask(match, mask);
        return '█'.repeat(match.length);
      });
      diff = diffWords(text, redacted);
    }
  }

  self.postMessage({ redacted, highlights, diff, error, unsafe });
};
