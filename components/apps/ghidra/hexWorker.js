/* eslint-env worker */
const BYTES_PER_LINE = 16;
const LINES_PER_CHUNK = 128;

self.onmessage = (e) => {
  const { id, code } = e.data;
  if (!id) return;

  const text = typeof code === 'string' ? code : '';
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const totalBytes = bytes.length;

  const byteLineMap = [];
  let currentLine = 0;
  for (const char of text) {
    const encodedChar = encoder.encode(char);
    for (let i = 0; i < encodedChar.length; i += 1) {
      byteLineMap.push(currentLine);
    }
    if (char === '\n') {
      currentLine += 1;
    }
  }

  postMessage({ id, type: 'start', totalBytes });

  let chunk = [];
  for (let offset = 0; offset < bytes.length; offset += BYTES_PER_LINE) {
    const slice = bytes.slice(offset, offset + BYTES_PER_LINE);
    const hexParts = Array.from(slice).map((b) => b.toString(16).padStart(2, '0'));
    const ascii = Array.from(slice)
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
      .join('');
    const sourceLine = byteLineMap[offset] ?? 0;
    chunk.push({
      offset,
      hex: hexParts.join(' '),
      ascii,
      sourceLine,
    });

    if (chunk.length === LINES_PER_CHUNK) {
      postMessage({ id, type: 'chunk', lines: chunk, totalBytes });
      chunk = [];
    }
  }

  if (chunk.length > 0) {
    postMessage({ id, type: 'chunk', lines: chunk, totalBytes });
  }

  postMessage({ id, type: 'done', totalBytes });
};
