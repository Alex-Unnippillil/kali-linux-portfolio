import { protocolName } from '../../../components/apps/wireshark/utils';
import type { Packet, StructuredPacket } from '../types';
import { EXPORT_COLUMNS } from '../types';

export const toStructuredPacket = (packet: Packet): StructuredPacket => ({
  timestamp: packet.timestamp,
  source: packet.src,
  destination: packet.dest,
  protocol: String(protocolName(packet.protocol)),
  info: packet.info ?? '',
  sport: typeof packet.sport === 'number' ? packet.sport : null,
  dport: typeof packet.dport === 'number' ? packet.dport : null,
});

export const packetsToNdjson = (packets: Packet[]): string =>
  packets.map((packet) => JSON.stringify(toStructuredPacket(packet))).join('\n');

const escapeCsv = (value: string | number | null): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const packetsToCsv = (packets: Packet[]): string => {
  const header = EXPORT_COLUMNS.join(',');
  const rows = packets.map((packet) => {
    const structured = toStructuredPacket(packet);
    return EXPORT_COLUMNS.map((column) =>
      escapeCsv(structured[column] as string | number | null)
    ).join(',');
  });
  return [header, ...rows].join('\n');
};
