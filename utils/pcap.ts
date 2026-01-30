export interface ParsedPacket {
  timestamp: string;
  timestampMs: number;
  len: number;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  plaintext?: string;
  decrypted?: string;
  sport?: number;
  dport?: number;
  data: Uint8Array;
  layers: Record<string, Record<string, string>>;
}

const formatMac = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');

const formatIp = (bytes: Uint8Array) => Array.from(bytes).join('.');

const protocolLabel = (proto: number) => {
  switch (proto) {
    case 6:
      return 'TCP';
    case 17:
      return 'UDP';
    case 1:
      return 'ICMP';
    default:
      return String(proto);
  }
};

const decodePacket = (data: Uint8Array) => {
  const layers: Record<string, Record<string, string>> = {};
  let src = '';
  let dest = '';
  let protocol = 0;
  let info = '';
  let sport: number | undefined;
  let dport: number | undefined;

  if (data.length >= 14) {
    const destMac = formatMac(data.slice(0, 6));
    const srcMac = formatMac(data.slice(6, 12));
    const etherType = (data[12] << 8) | data[13];
    layers.Ethernet = {
      Destination: destMac,
      Source: srcMac,
      Type: `0x${etherType.toString(16).padStart(4, '0')}`,
    };

    if (etherType === 0x0800 && data.length >= 34) {
      const ipHeaderStart = 14;
      const ipHeaderLen = (data[ipHeaderStart] & 0x0f) * 4;
      if (data.length >= ipHeaderStart + ipHeaderLen) {
        src = formatIp(data.slice(ipHeaderStart + 12, ipHeaderStart + 16));
        dest = formatIp(data.slice(ipHeaderStart + 16, ipHeaderStart + 20));
        protocol = data[ipHeaderStart + 9];
        const ttl = data[ipHeaderStart + 8];
        layers.IPv4 = {
          Source: src,
          Destination: dest,
          Protocol: protocolLabel(protocol),
          TTL: ttl.toString(),
        };

        const transportStart = ipHeaderStart + ipHeaderLen;
        if (protocol === 6 && data.length >= transportStart + 20) {
          sport = (data[transportStart] << 8) | data[transportStart + 1];
          dport = (data[transportStart + 2] << 8) | data[transportStart + 3];
          const flags = data[transportStart + 13];
          const flagDefinitions: Array<[number, string]> = [
            [0x01, 'FIN'],
            [0x02, 'SYN'],
            [0x04, 'RST'],
            [0x08, 'PSH'],
            [0x10, 'ACK'],
            [0x20, 'URG'],
            [0x40, 'ECE'],
            [0x80, 'CWR'],
          ];
          const flagLabels = flagDefinitions
            .filter(([mask]) => (flags & mask) !== 0)
            .map(([, label]) => label as string);
          layers.TCP = {
            'Source Port': String(sport),
            'Destination Port': String(dport),
            Flags: flagLabels.length ? flagLabels.join(', ') : 'None',
          };
          info = `TCP ${sport} → ${dport}`;
        } else if (protocol === 17 && data.length >= transportStart + 8) {
          sport = (data[transportStart] << 8) | data[transportStart + 1];
          dport = (data[transportStart + 2] << 8) | data[transportStart + 3];
          layers.UDP = {
            'Source Port': String(sport),
            'Destination Port': String(dport),
          };
          info = `UDP ${sport} → ${dport}`;
        }
      }
    }
  }

  return { src, dest, protocol, info, sport, dport, layers };
};

const buildPacket = (
  data: Uint8Array,
  timestampSeconds: number,
  timestampMs: number,
  len: number,
  precision = 6
): ParsedPacket => {
  const decoded = decodePacket(data);
  const timestamp = timestampSeconds.toFixed(precision);
  return {
    timestamp,
    timestampMs,
    len,
    src: decoded.src,
    dest: decoded.dest,
    protocol: decoded.protocol,
    info: decoded.info || `len=${len}`,
    sport: decoded.sport,
    dport: decoded.dport,
    data,
    layers: decoded.layers,
  };
};

const parseClassicPcap = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  let little = false;
  let tsResolution = 1e-6;

  if (magic === 0xa1b2c3d4) {
    little = false;
  } else if (magic === 0xd4c3b2a1) {
    little = true;
  } else if (magic === 0xa1b23c4d) {
    little = false;
    tsResolution = 1e-9;
  } else if (magic === 0x4d3cb2a1) {
    little = true;
    tsResolution = 1e-9;
  } else {
    throw new Error('Unsupported pcap format');
  }

  let offset = 24;
  const packets: ParsedPacket[] = [];
  while (offset + 16 <= view.byteLength) {
    const tsSec = view.getUint32(offset, little);
    const tsSub = view.getUint32(offset + 4, little);
    const capLen = view.getUint32(offset + 8, little);
    const origLen = view.getUint32(offset + 12, little);
    offset += 16;
    if (offset + capLen > view.byteLength) break;
    const data = new Uint8Array(buf.slice(offset, offset + capLen));
    const timestampSeconds = tsSec + tsSub * tsResolution;
    const timestampMs = timestampSeconds * 1000;
    packets.push(
      buildPacket(data, timestampSeconds, timestampMs, origLen, tsResolution === 1e-9 ? 9 : 6)
    );
    offset += capLen;
  }
  return packets;
};

const parsePcapNg = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  let offset = 0;
  let little = true;
  const packets: ParsedPacket[] = [];
  const interfaces: { tsres: number }[] = [];

  while (offset + 12 <= view.byteLength) {
    const blockType = view.getUint32(offset, little);
    let blockLen = view.getUint32(offset + 4, little);
    if (blockLen < 12 || offset + blockLen > view.byteLength) break;

    if (blockType === 0x0a0d0d0a) {
      const bom = view.getUint32(offset + 8, true);
      if (bom === 0x1a2b3c4d) {
        little = true;
      } else if (bom === 0x4d3c2b1a) {
        little = false;
      }
      blockLen = view.getUint32(offset + 4, little);
    } else if (blockType === 0x00000001) {
      let tsres = 1e-6;
      let optOffset = offset + 20;
      while (optOffset + 4 <= offset + blockLen - 4) {
        const optCode = view.getUint16(optOffset, little);
        const optLen = view.getUint16(optOffset + 2, little);
        optOffset += 4;
        if (optCode === 9 && optLen === 1) {
          const val = view.getUint8(optOffset);
          tsres = val & 0x80 ? 2 ** -(val & 0x7f) : 10 ** -val;
        }
        optOffset += optLen;
        optOffset = (optOffset + 3) & ~3;
        if (optCode === 0) break;
      }
      interfaces.push({ tsres });
    } else if (blockType === 0x00000006) {
      const ifaceId = view.getUint32(offset + 8, little);
      const tsHigh = view.getUint32(offset + 12, little);
      const tsLow = view.getUint32(offset + 16, little);
      const capLen = view.getUint32(offset + 20, little);
      const origLen = view.getUint32(offset + 24, little);
      const dataStart = offset + 28;
      if (dataStart + capLen <= view.byteLength) {
        const data = new Uint8Array(buf.slice(dataStart, dataStart + capLen));
        const tsres = interfaces[ifaceId]?.tsres ?? 1e-6;
        const timestampSeconds = (tsHigh * 2 ** 32 + tsLow) * tsres;
        const timestampMs = timestampSeconds * 1000;
        const precision = Math.max(0, Math.min(9, Math.round(Math.log10(1 / tsres))));
        packets.push(buildPacket(data, timestampSeconds, timestampMs, origLen, precision));
      }
    }

    offset += blockLen;
  }

  return packets;
};

export const parsePcap = (buf: ArrayBuffer): ParsedPacket[] => {
  const view = new DataView(buf);
  const magic = view.getUint32(0, false);
  if (
    magic === 0xa1b2c3d4 ||
    magic === 0xd4c3b2a1 ||
    magic === 0xa1b23c4d ||
    magic === 0x4d3cb2a1
  ) {
    return parseClassicPcap(buf);
  }
  if (magic === 0x0a0d0d0a) {
    return parsePcapNg(buf);
  }
  throw new Error('Unsupported pcap format');
};

export default parsePcap;
