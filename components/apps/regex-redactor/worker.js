import { diffWords } from 'diff';
import safeRegex from 'safe-regex';
import { RE2 } from 're2-wasm';
import { PRESETS } from './presets';

self.onmessage = async (e) => {
  const { text, pattern, preset, mask, engine } = e.data;

  let error = '';
  let unsafe = false;
  let warning = '';
  let redacted = text;
  const highlights = [];
  let diff = [];

  if (pattern) {
    let regex;
    const compileStart = performance.now();
    try {
      if (engine === 're2') {
        const mod = await import('re2-wasm');
        regex = new mod.RE2(pattern, 'g');
      } else {
        unsafe = !safeRegex(pattern);
        if (unsafe) {
          warning =
            'Pattern may cause catastrophic backtracking. Consider using the RE2 engine or simplifying the expression.';
        }
        regex = new RegExp(pattern, 'g');
      }

    } catch (err) {
      error = err.message;
    }
    const compileTime = performance.now() - compileStart;
    if (!error && compileTime > 200) {
      warning =
        warning ||
        `Pattern compilation took ${compileTime.toFixed(0)} ms which may impact performance.`;
    }
    if (regex) {
      const execStart = performance.now();
      try {
        redacted = text.replace(regex, (match, offset) => {
          highlights.push({ start: offset, end: offset + match.length });
          const p = PRESETS.find((p) => p.label === preset);
          if (p && typeof p.mask === 'function') return p.mask(match, mask);
          return '█'.repeat(match.length);
        });
        diff = diffWords(text, redacted);
      } catch (err) {
        error = err.message;
      }
      const execTime = performance.now() - execStart;
      if (!error && execTime > 200) {
        warning =
          warning ||
          `Pattern execution took ${execTime.toFixed(0)} ms. Nested quantifiers or large backtracking sets can cause slow matches.`;
      }
    }
  }

  self.postMessage({ redacted, highlights, diff, error, unsafe, warning });
};
