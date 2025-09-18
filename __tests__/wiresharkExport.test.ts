import { packetsToCsv, packetsToNdjson, toStructuredPacket } from '../apps/wireshark/utils/export';
import type { Packet } from '../apps/wireshark/types';

const mockPackets: Packet[] = [
  {
    timestamp: '1000.000001',
    src: '10.0.0.1',
    dest: '10.0.0.2',
    protocol: 6,
    info: 'HTTP,GET /index.html',
    data: new Uint8Array([0, 1, 2]),
    sport: 443,
    dport: 515,
  },
  {
    timestamp: '1001.125000',
    src: '10.0.0.2',
    dest: '10.0.0.3',
    protocol: 17,
    info: 'DNS response',
    data: new Uint8Array([3, 4, 5]),
    sport: 53,
  },
];

describe('Wireshark export helpers', () => {
  it('serialises packets to NDJSON with structured fields', () => {
    const ndjson = packetsToNdjson(mockPackets);
    const lines = ndjson.split('\n');
    expect(lines).toHaveLength(mockPackets.length);
    lines.forEach((line, idx) => {
      expect(line).toBe(JSON.stringify(toStructuredPacket(mockPackets[idx])));
    });
  });

  it('orders CSV columns consistently', () => {
    const csv = packetsToCsv(mockPackets);
    const rows = csv.split('\n');
    expect(rows[0]).toBe('timestamp,source,destination,protocol,info,sport,dport');
    expect(rows[1]).toBe('1000.000001,10.0.0.1,10.0.0.2,TCP,"HTTP,GET /index.html",443,515');
    expect(rows[2]).toBe('1001.125000,10.0.0.2,10.0.0.3,UDP,DNS response,53,');
  });
});
