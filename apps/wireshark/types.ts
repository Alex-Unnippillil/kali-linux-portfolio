export interface Packet {
  timestamp: string;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  data: Uint8Array;
  sport?: number;
  dport?: number;
}

export interface StructuredPacket {
  timestamp: string;
  source: string;
  destination: string;
  protocol: string;
  info: string;
  sport: number | null;
  dport: number | null;
}

export const EXPORT_COLUMNS = [
  'timestamp',
  'source',
  'destination',
  'protocol',
  'info',
  'sport',
  'dport',
] as const;

export type ExportColumn = (typeof EXPORT_COLUMNS)[number];
