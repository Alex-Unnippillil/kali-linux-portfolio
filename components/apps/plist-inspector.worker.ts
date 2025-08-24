import plist from 'plist';
import bplist from 'bplist-parser';
import { Buffer } from 'buffer';

const detectFormat = (bytes: Uint8Array): string => {
  if (
    bytes.length > 6 &&
    bytes[0] === 0x62 &&
    bytes[1] === 0x70 &&
    bytes[2] === 0x6c &&
    bytes[3] === 0x69 &&
    bytes[4] === 0x73 &&
    bytes[5] === 0x74
  ) {
    return 'binary';
  }
  const text = new TextDecoder().decode(bytes.slice(0, 100)).trim();
  if (text.startsWith('<?xml')) return 'xml';
  if (text.startsWith('{') || text.startsWith('[')) return 'json';
  return 'unknown';
};

self.onmessage = (e: MessageEvent) => {
  const bytes = new Uint8Array(e.data.buffer);
  const format = detectFormat(bytes);
  try {
    let obj: any;
    if (format === 'binary') {
      const parsed = bplist.parseBuffer(Buffer.from(bytes));
      obj = parsed.length === 1 ? parsed[0] : parsed;
    } else if (format === 'xml') {
      const text = new TextDecoder().decode(bytes);
      obj = plist.parse(text);
    } else if (format === 'json') {
      const text = new TextDecoder().decode(bytes);
      obj = JSON.parse(text);
    } else {
      throw new Error('Unknown plist format');
    }
    (self as any).postMessage({ type: 'result', root: obj, format });
  } catch (err: any) {
    const corruption =
      format === 'binary'
        ? Buffer.from(bytes.slice(-32)).toString('hex')
        : null;
    (self as any).postMessage({
      type: 'error',
      error: err.message || String(err),
      corruption,
      format,
    });
  }
};
