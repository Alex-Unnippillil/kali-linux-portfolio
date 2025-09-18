import type {
  ParsedPacket,
  WifiAnalysisResult,
  WifiDiscovery,
  WifiNetworkSummary,
} from '../types/pcap';

const parseEthernetIpv4 = (data: Uint8Array) => {
  if (data.length < 34) {
    return { src: '', dest: '', protocol: 0, info: '' };
  }
  const etherType = (data[12] << 8) | data[13];
  if (etherType !== 0x0800) {
    return { src: '', dest: '', protocol: 0, info: '' };
  }
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
    const data = new Uint8Array(buf.slice(offset, offset + capLen));
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

  return packets;
};

const parsePcapNg = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  let offset = 0;
  let little = true;
  const packets: ParsedPacket[] = [];

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
      const data = new Uint8Array(buf.slice(dataStart, dataStart + capLen));
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

  return packets;
};

export const parsePcap = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  if (magic === 0xa1b2c3d4 || magic === 0xd4c3b2a1) {
    return parseClassicPcap(buf);
  }
  if (magic === 0x0a0d0d0a) {
    return parsePcapNg(buf);
  }
  throw new Error('Unsupported pcap format');
};

const macToString = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');

const parseMgmtFrame = (frame: Uint8Array) => {
  const bssid = macToString(frame.slice(16, 22));
  let ssid = '';
  let channel: number | undefined;
  const decoder = new TextDecoder();
  let off = 36;
  while (off + 2 <= frame.length) {
    const tag = frame[off];
    const len = frame[off + 1];
    const data = frame.slice(off + 2, off + 2 + len);
    if (tag === 0) {
      ssid = decoder.decode(data);
    } else if (tag === 3 && data.length) {
      channel = data[0];
    }
    off += 2 + len;
  }
  return { ssid, bssid, channel };
};

export const analyzeWifiCapture = (buf: ArrayBuffer): WifiAnalysisResult => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, true);
  if (magic !== 0xa1b2c3d4 && magic !== 0xd4c3b2a1) {
    throw new Error('Only classic pcap captures are supported for 802.11 analysis');
  }

  let offset = 24;
  const networks: Record<string, WifiNetworkSummary> = {};
  const channelCounts: Record<number, number> = {};
  const timeCounts: Record<number, number> = {};
  const discoveries: WifiDiscovery[] = [];
  let startTime: number | null = null;

  while (offset + 16 <= view.byteLength) {
    const tsSec = view.getUint32(offset, true);
    const tsUsec = view.getUint32(offset + 4, true);
    const inclLen = view.getUint32(offset + 8, true);
    offset += 16;
    if (offset + inclLen > view.byteLength) break;

    const data = new Uint8Array(buf.slice(offset, offset + inclLen));
    offset += inclLen;

    if (data.length < 4) continue;
    const radiotapLen = data[2] | (data[3] << 8);
    if (data.length < radiotapLen + 24) continue;

    const frame = data.subarray(radiotapLen);
    const fc = frame[0] | (frame[1] << 8);
    const type = (fc >> 2) & 0x3;
    const subtype = (fc >> 4) & 0xf;
    if (type !== 0 || (subtype !== 8 && subtype !== 5)) {
      continue;
    }

    const info = parseMgmtFrame(frame);
    const key = info.bssid || info.ssid;
    if (!key) {
      continue;
    }

    if (startTime == null) {
      startTime = tsSec;
    }

    if (!networks[key]) {
      networks[key] = { ...info, frames: 0 };
      discoveries.push({
        ssid: info.ssid,
        bssid: info.bssid,
        discoveredAt: tsSec * 1000 + Math.floor(tsUsec / 1000),
      });
    }

    networks[key].frames += 1;

    if (info.channel != null) {
      channelCounts[info.channel] = (channelCounts[info.channel] || 0) + 1;
    }

    if (startTime != null) {
      const bucket = tsSec - startTime;
      timeCounts[bucket] = (timeCounts[bucket] || 0) + 1;
    }
  }

  return {
    networks: Object.values(networks),
    channelCounts,
    timeCounts,
    discoveries,
  };
};
