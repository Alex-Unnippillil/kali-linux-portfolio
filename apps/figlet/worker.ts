import figlet from 'figlet';
// Fonts are loaded dynamically from the main thread. This keeps the worker
// lightweight and allows only the fonts that are actually used to be loaded.

function strip(lines: string[]) {
  return lines.map((l) => l.replace(/\s+$/, ''));
}

function isMonospace(name: string) {
  const chars = 'ABCDE';
  let width: number | undefined;
  for (const ch of chars) {
    const glyph = strip(
      figlet.textSync(ch, { font: name as any }).split('\n'),
    );
    const w = glyph.reduce((m, line) => Math.max(m, line.length), 0);
    if (width === undefined) width = w;
    else if (w !== width) return false;
  }
  return true;
}

self.onmessage = (e: MessageEvent<any>) => {
  if (e.data?.type === 'load') {
    const { name, data } = e.data as { name: string; data: string };
    try {
      figlet.parseFont(name, data);
      const preview = figlet.textSync('Figlet', { font: name as any });
      const mono = isMonospace(name);
      self.postMessage({ type: 'font', font: name, preview, mono });
    } catch {
      /* ignore bad font */
    }
    return;
  }

  const { text = '', font, width = 80, layout = 'default' } = e.data as {
    text: string;
    font: string;
    width: number;
    layout: string;
  };
  if (!font) return;
  const normalized = String(text)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .join('\n');
  const rendered = figlet.textSync(normalized, {
    font: font as any,
    width,
    horizontalLayout: layout as figlet.KerningMethods,
  });
  self.postMessage({ type: 'render', output: rendered });
};
