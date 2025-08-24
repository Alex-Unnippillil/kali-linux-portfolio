import { read, find } from 'cfb';

interface ParseEvent {
  time: number;
  source: string;
  detail: string;
}

const EPOCH_DIFF = 11644473600000; // ms between 1601 and 1970

function filetimeToDate(low: number, high: number): Date {
  const ft = (BigInt(high) << 32n) + BigInt(low);
  const ms = Number(ft / 10000n) - EPOCH_DIFF;
  return new Date(ms);
}

function parsePrefetch(buffer: ArrayBuffer): ParseEvent[] {
  const dv = new DataView(buffer);
  const sig = dv.getUint32(4, true);
  if (sig !== 0x41434353) throw new Error('Unsupported Prefetch format');
  let name = '';
  for (let i = 0; i < 60; i += 1) {
    const c = dv.getUint16(16 + i * 2, true);
    if (c === 0) break;
    name += String.fromCharCode(c);
  }
  const runCount = dv.getUint32(120, true);
  const low = dv.getUint32(128, true);
  const high = dv.getUint32(132, true);
  const lastRun = filetimeToDate(low, high);
  return [{ time: lastRun.getTime(), source: 'Prefetch', detail: `${name} (run ${runCount} times)` }];
}

function parseJumpList(buffer: ArrayBuffer): ParseEvent[] {
  const cf = read(new Uint8Array(buffer), { type: 'array' });
  const dest = find(cf, 'DestList');
  if (!dest || !dest.content) throw new Error('Unsupported JumpList format');
  const dv = new DataView(dest.content.buffer, dest.content.byteOffset, dest.content.byteLength);
  const headerSize = 32;
  const entrySize = 160;
  const events: ParseEvent[] = [];
  const count = Math.floor((dv.byteLength - headerSize) / entrySize);
  for (let i = 0; i < count; i += 1) {
    const base = headerSize + i * entrySize;
    const low = dv.getUint32(base + 8, true);
    const high = dv.getUint32(base + 12, true);
    const time = filetimeToDate(low, high);
    let path = '';
    const ofs = dv.getUint16(base + 0x50, true);
    if (ofs > 0 && ofs < entrySize) {
      for (let j = base + ofs; j < base + entrySize; j += 2) {
        const c = dv.getUint16(j, true);
        if (c === 0) break;
        path += String.fromCharCode(c);
      }
    }
    events.push({ time: time.getTime(), source: 'JumpList', detail: path || `entry ${i + 1}` });
  }
  return events;
}

self.onmessage = (e: MessageEvent<{ id: number; name: string; buffer: ArrayBuffer }>) => {
  const { id, name, buffer } = e.data;
  try {
    let events: ParseEvent[] = [];
    if (/\.pf$/i.test(name)) {
      events = parsePrefetch(buffer);
    } else if (/\.automaticDestinations-ms$|\.customDestinations-ms$/i.test(name)) {
      events = parseJumpList(buffer);
    } else {
      throw new Error('Unsupported format');
    }
    postMessage({ id, events });
  } catch (err: any) {
    postMessage({ id, error: err.message });
  }
};

export {};
