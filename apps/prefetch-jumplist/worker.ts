import { read, find } from 'cfb';

interface ParseEvent {
  time: number;
  source: string;
  file: string;
  runCount?: number;
  lnk?: {
    target?: string;
    created?: number;
  };
  anomaly?: boolean;
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
  const time = lastRun.getTime();
  return [
    {
      time,
      source: 'Prefetch',
      file: name,
      runCount,
      anomaly: runCount <= 0 || time > Date.now(),
    },
  ];
}

function readString(dv: DataView, offset: number, unicode = true): string {
  let s = '';
  for (let i = offset; i < dv.byteLength; i += unicode ? 2 : 1) {
    const c = unicode ? dv.getUint16(i, true) : dv.getUint8(i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function parseLnk(buf: Uint8Array): {
  target?: string;
  created?: number;
  accessed?: number;
  modified?: number;
} {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const flags = dv.getUint32(0x14, true);
  const created = filetimeToDate(dv.getUint32(0x1c, true), dv.getUint32(0x20, true));
  const accessed = filetimeToDate(dv.getUint32(0x24, true), dv.getUint32(0x28, true));
  const modified = filetimeToDate(dv.getUint32(0x2c, true), dv.getUint32(0x30, true));
  let target = '';
  let offset = 0x4c;
  if (flags & 0x1) {
    const idListSize = dv.getUint16(offset, true);
    offset += 2 + idListSize;
  }
  if (flags & 0x2) {
    const liSize = dv.getUint32(offset, true);
    const liFlags = dv.getUint32(offset + 8, true);
    if (liFlags & 1) {
      const localBasePathOffset = dv.getUint32(offset + 16, true);
      const localBasePathOffsetUnicode = dv.getUint32(offset + 28, true);
      const ofs =
        localBasePathOffsetUnicode && localBasePathOffsetUnicode < liSize
          ? offset + localBasePathOffsetUnicode
          : offset + localBasePathOffset;
      target = readString(dv, ofs);
    }
  }
  return {
    target,
    created: created.getTime(),
    accessed: accessed.getTime(),
    modified: modified.getTime(),
  };
}

function parseLnkFile(buffer: ArrayBuffer): ParseEvent[] {
  const lnk = parseLnk(new Uint8Array(buffer));
  const events: ParseEvent[] = [];
  const name = lnk.target || 'shortcut';
  const now = Date.now();
  if (lnk.created) {
    events.push({
      time: lnk.created,
      source: 'LNK Created',
      file: name,
      lnk,
      anomaly: lnk.created > now,
    });
  }
  if (lnk.modified) {
    events.push({
      time: lnk.modified,
      source: 'LNK Modified',
      file: name,
      lnk,
      anomaly: lnk.modified > now,
    });
  }
  if (lnk.accessed) {
    events.push({
      time: lnk.accessed,
      source: 'LNK Accessed',
      file: name,
      lnk,
      anomaly: lnk.accessed > now,
    });
  }
  return events;
}

function parseJumpList(buffer: ArrayBuffer): ParseEvent[] {
  const cf = read(new Uint8Array(buffer), { type: 'array' });
  const dest = find(cf, 'DestList');
  if (!dest || !dest.content) throw new Error('Unsupported JumpList format');
  const content = dest.content as Uint8Array;
  const dv = new DataView(content.buffer, content.byteOffset, content.byteLength);
  const headerSize = 32;
  const entrySize = 160;
  const events: ParseEvent[] = [];
  const count = Math.floor((dv.byteLength - headerSize) / entrySize);
  for (let i = 0; i < count; i += 1) {
    const base = headerSize + i * entrySize;
    const low = dv.getUint32(base + 8, true);
    const high = dv.getUint32(base + 12, true);
    const time = filetimeToDate(low, high);
    const t = time.getTime();
    const runCount = dv.getUint32(base + 0x18, true);
    let path = '';
    const ofs = dv.getUint16(base + 0x50, true);
    if (ofs > 0 && ofs < entrySize) {
      path = readString(dv, base + ofs);
    }
    let lnk;
    const stream = find(cf, String(i + 1));
    if (stream && stream.content) {
      lnk = parseLnk(stream.content as Uint8Array);
    }
    events.push({
      time: t,
      source: 'JumpList',
      file: path || `entry ${i + 1}`,
      runCount,
      lnk,
      anomaly: runCount <= 0 || t > Date.now() || (lnk?.created && lnk.created > t),
    });
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
    } else if (/\.lnk$/i.test(name)) {
      events = parseLnkFile(buffer);
    } else {
      throw new Error('Unsupported format');
    }
    postMessage({ id, events });
  } catch (err: any) {
    postMessage({ id, error: err.message });
  }
};

export {};
