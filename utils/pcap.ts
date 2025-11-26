import { rentUint8Array, releaseTypedArray } from './pools';

const perfEnabled =
  typeof performance !== 'undefined' &&
  typeof performance.mark === 'function' &&
  typeof performance.measure === 'function';

const perfCanClear =
  typeof performance !== 'undefined' && typeof performance.clearMarks === 'function';

const perfMark = (name: string) => {
  if (!perfEnabled) return;
  try {
    performance.mark(name);
  } catch {
    // ignore unsupported marks
  }
};

const perfMeasure = (name: string, start: string, end: string) => {
  if (!perfEnabled) return;
  try {
    performance.measure(name, start, end);
  } catch {
    // ignore duplicate mark failures
  }
  if (perfCanClear) {
    try {
      performance.clearMarks(start);
      performance.clearMarks(end);
    } catch {
      // ignore
    }
  }
};

const copyPacketData = (buf: ArrayBuffer, offset: number, length: number) => {
  const slice = rentUint8Array(length);
  slice.set(new Uint8Array(buf, offset, length));
  return slice;
};

export interface ParsedPacket {
  timestamp: string;
  len: number;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  sport?: number;
  dport?: number;
  data: Uint8Array;
  layers: Record<string, unknown>;
}

const parseEthernetIpv4 = (data: Uint8Array) => {
  if (data.length < 34) return { src: '', dest: '', protocol: 0, info: '' };
  const etherType = (data[12] << 8) | data[13];
  if (etherType !== 0x0800) return { src: '', dest: '', protocol: 0, info: '' };
  const protocol = data[23];
  const src = Array.from(data.slice(26, 30)).join('.');
  const dest = Array.from(data.slice(30, 34)).join('.');
  let info = '';
  if (protocol === 6 && data.length >= 54) {
    const sport = (data[34] << 8) | data[35];
    const dport = (data[36] << 8) | data[37];
    info = `TCP ${sport} → ${dport}`;
    return { src, dest, protocol, info, sport, dport };
  }
  if (protocol === 17 && data.length >= 42) {
    const sport = (data[34] << 8) | data[35];
    const dport = (data[36] << 8) | data[37];
    info = `UDP ${sport} → ${dport}`;
    return { src, dest, protocol, info, sport, dport };
  }
  return { src, dest, protocol, info };
};

const parseClassicPcap = (buf: ArrayBuffer): ParsedPacket[] => {
  const start = 'pcap:classic:start';
  const end = 'pcap:classic:end';
  perfMark(start);
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  const little = magic === 0xd4c3b2a1;
  let offset = 24;
  const packets: ParsedPacket[] = [];
  while (offset + 16 <= view.byteLength) {
    const tsSec = view.getUint32(offset, little);
    const tsUsec = view.getUint32(offset + 4, little);
    const capLen = view.getUint32(offset + 8, little);
    const origLen = view.getUint32(offset + 12, little);
    offset += 16;
    if (offset + capLen > view.byteLength) break;
    const data = copyPacketData(buf, offset, capLen);
    const meta = parseEthernetIpv4(data);
    packets.push({
      timestamp: `${tsSec}.${tsUsec.toString().padStart(6, '0')}`,
      len: origLen,
      src: meta.src,
      dest: meta.dest,
      protocol: meta.protocol,
      info: meta.info || `len=${origLen}`,
      sport: meta.sport,
      dport: meta.dport,
      data,
      layers: {},
    });
    offset += capLen;
  }
  perfMark(end);
  perfMeasure('pcap:classic:duration', start, end);
  return packets;
};

const parsePcapNg = (buf: ArrayBuffer): ParsedPacket[] => {
  const start = 'pcap:ng:start';
  const end = 'pcap:ng:end';
  perfMark(start);
  const view = new DataView(buf);
  let offset = 0;
  let little = true;
  const packets: ParsedPacket[] = [];

  // read section header
  if (view.getUint32(offset, false) !== 0x0a0d0d0a) {
    throw new Error('Unsupported pcap format');
  }
  const bom = view.getUint32(offset + 8, false);
  little = bom === 0x4d3c2b1a;
  let blockTotalLength = view.getUint32(offset + 4, little);
  offset += blockTotalLength;

  while (offset + 8 <= view.byteLength) {
    const blockType = view.getUint32(offset, little);
    blockTotalLength = view.getUint32(offset + 4, little);
    if (blockType === 0x00000006) {
      const tsHigh = view.getUint32(offset + 12, little);
      const tsLow = view.getUint32(offset + 16, little);
      const capLen = view.getUint32(offset + 20, little);
      const origLen = view.getUint32(offset + 24, little);
      const dataStart = offset + 28;
      const data = copyPacketData(buf, dataStart, capLen);
      const meta = parseEthernetIpv4(data);
      const ts = (BigInt(tsHigh) << 32n) + BigInt(tsLow);
      const tsSec = Number(ts / 1000000n);
      const tsUsec = Number(ts % 1000000n);
      packets.push({
        timestamp: `${tsSec}.${tsUsec.toString().padStart(6, '0')}`,
        len: origLen,
        src: meta.src,
        dest: meta.dest,
        protocol: meta.protocol,
        info: meta.info || `len=${origLen}`,
        sport: meta.sport,
        dport: meta.dport,
        data,
        layers: {},
      });
    }
    offset += blockTotalLength;
  }
  perfMark(end);
  perfMeasure('pcap:ng:duration', start, end);
  return packets;
};

export const parsePcap = (buf: ArrayBuffer): ParsedPacket[] => {
  const start = 'pcap:parse:start';
  const end = 'pcap:parse:end';
  perfMark(start);
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  if (magic === 0xa1b2c3d4 || magic === 0xd4c3b2a1) {
    const parsed = parseClassicPcap(buf);
    perfMark(end);
    perfMeasure('pcap:parse:duration', start, end);
    return parsed;
  }
  if (magic === 0x0a0d0d0a) {
    const parsed = parsePcapNg(buf);
    perfMark(end);
    perfMeasure('pcap:parse:duration', start, end);
    return parsed;
  }
  perfMark(end);
  perfMeasure('pcap:parse:duration', start, end);
  throw new Error('Unsupported pcap format');
};

export const releaseParsedPackets = (packets: ParsedPacket[]) => {
  packets.forEach((pkt) => {
    releaseTypedArray(pkt.data);
  });
};

export default parsePcap;
