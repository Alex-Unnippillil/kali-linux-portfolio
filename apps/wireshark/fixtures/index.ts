import type { ParsedPacket } from '../../../utils/pcap';
import httpConversation from '../tinyCapture.json';
import dnsLookup from './dnsLab.json';

export type FixtureTarget = 'display' | 'bpf';

export interface FixtureFilter {
  label: string;
  expression: string;
  target: FixtureTarget;
  explanation: string;
}

export interface FixtureSource {
  label: string;
  url: string;
}

export interface CaptureFixture {
  id: string;
  title: string;
  description: string;
  packets: ParsedPacket[];
  filters: FixtureFilter[];
  callouts: string[];
  sources: FixtureSource[];
}

type RawPacket = Omit<ParsedPacket, 'data' | 'layers' | 'len'> & {
  len?: number;
  layers?: Record<string, unknown>;
  dataHex?: string;
};

const hexToBytes = (hex?: string): Uint8Array => {
  if (!hex) return new Uint8Array();
  const clean = hex.replace(/\s+/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
};

const normalise = (packets: RawPacket[]): ParsedPacket[] =>
  packets.map((pkt) => {
    const data = hexToBytes(pkt.dataHex);
    const len = data.length > 0 ? data.length : pkt.len ?? 0;
    return {
      ...pkt,
      len,
      data,
      layers: pkt.layers ?? {},
    } as ParsedPacket;
  });

const fixtures: CaptureFixture[] = [
  {
    id: 'http-handshake',
    title: 'HTTP handshake and GET request',
    description:
      'A sanitised HTTP conversation that walks through a TCP three-way handshake followed by a GET request for /index.html.',
    packets: normalise(httpConversation as RawPacket[]),
    filters: [
      {
        label: 'Handshake flags',
        expression: 'tcp.flags.syn == 1 || tcp.flags.ack == 1',
        target: 'display',
        explanation:
          'Highlights the SYN/SYN-ACK/ACK packets that establish the TCP session.',
      },
      {
        label: 'HTTP stream',
        expression: 'tcp.port == 80 && tcp.stream eq 0',
        target: 'display',
        explanation:
          'Focuses on the application payload exchanged on the first TCP stream.',
      },
      {
        label: 'Port 80',
        expression: 'port 80',
        target: 'bpf',
        explanation:
          'Capture filter equivalent that limits traffic to classic HTTP ports.',
      },
    ],
    callouts: [
      'Sequence numbers increment after the HTTP payload because the PSH-ACK carries the request body.',
      'The Host header in the HTTP layer shows the virtual host a browser would use.',
    ],
    sources: [
      {
        label: 'Wireshark sample: http.cap',
        url: 'https://gitlab.com/wireshark/wireshark/-/raw/master/test/captures/http.cap',
      },
    ],
  },
  {
    id: 'dns-lookup',
    title: 'Recursive DNS lookup for www.example.com',
    description:
      'A UDP exchange between a lab workstation and a public resolver that returns the IPv4 address for www.example.com.',
    packets: normalise(dnsLookup as RawPacket[]),
    filters: [
      {
        label: 'DNS only',
        expression: 'udp.port == 53',
        target: 'display',
        explanation:
          'Limits the packet list to DNS queries and responses on the default port.',
      },
      {
        label: 'DNS query ids',
        expression: 'dns.id == 0x1a2b',
        target: 'display',
        explanation:
          'Shows how request and response packets use the same transaction identifier.',
      },
      {
        label: 'UDP 53',
        expression: 'port 53',
        target: 'bpf',
        explanation:
          'Capture filter that matches resolver traffic during packet capture.',
      },
    ],
    callouts: [
      'The query flags show a standard recursive lookup, while the response flags indicate one cached answer.',
      'Answers embed the resolved IPv4 address, which later TCP requests can target.',
    ],
    sources: [
      {
        label: 'Wireshark sample: dns.cap',
        url: 'https://gitlab.com/wireshark/wireshark/-/raw/master/test/captures/dns.cap',
      },
    ],
  },
];

export default fixtures;
