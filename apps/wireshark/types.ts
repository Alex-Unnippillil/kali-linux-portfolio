export interface ParsedPacket {
  index: number;
  timestamp: string;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  data: Uint8Array;
  length: number;
  sport?: number;
  dport?: number;
}

export type PacketPredicate<T extends ParsedPacket = ParsedPacket> = (
  packet: T
) => boolean;
