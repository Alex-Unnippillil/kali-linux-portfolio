import { parsePcap } from '../../../utils/pcap';

interface ParseRequest {
  type: 'parse';
  buffer: ArrayBuffer;
}

interface PacketSummary {
  timestamp: string;
  len: number;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  sport?: number;
  dport?: number;
}

interface ParseSuccess {
  type: 'parsed';
  packets: PacketSummary[];
}

interface ParseError {
  type: 'error';
  message: string;
}

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { data } = event;
  if (data?.type !== 'parse') return;
  try {
    const packets = parsePcap(data.buffer).map((pkt) => ({
      timestamp: pkt.timestamp,
      len: pkt.len,
      src: pkt.src,
      dest: pkt.dest,
      protocol: pkt.protocol,
      info: pkt.info,
      sport: pkt.sport,
      dport: pkt.dport,
    }));
    const response: ParseSuccess = { type: 'parsed', packets };
    self.postMessage(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse file';
    const response: ParseError = { type: 'error', message };
    self.postMessage(response);
  }
};

export {};
