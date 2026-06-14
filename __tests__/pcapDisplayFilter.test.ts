import { createBpfPredicate } from '../apps/wireshark/utils/bpf';
import { ParsedPacket } from '../apps/wireshark/types';

const basePacket = (overrides: Partial<ParsedPacket> = {}): ParsedPacket => ({
  index: overrides.index ?? 1,
  timestamp: overrides.timestamp ?? '1.000000',
  src: overrides.src ?? '10.0.0.1',
  dest: overrides.dest ?? '10.0.0.2',
  protocol: overrides.protocol ?? 6,
  info: overrides.info ?? 'tcp packet',
  data: overrides.data ?? new Uint8Array(),
  length: overrides.length ?? 64,
  sport: overrides.sport,
  dport: overrides.dport,
});

describe('createBpfPredicate', () => {
  it('filters by protocol keyword', () => {
    const packets = [
      basePacket({ protocol: 6 }),
      basePacket({ protocol: 17, index: 2, info: 'udp packet' }),
    ];
    const predicate = createBpfPredicate('tcp');
    expect(packets.filter(predicate)).toEqual([packets[0]]);
  });

  it('matches host clauses with direction', () => {
    const packets = [
      basePacket({ src: '1.1.1.1', dest: '2.2.2.2' }),
      basePacket({ index: 2, src: '3.3.3.3', dest: '1.1.1.1' }),
    ];
    expect(packets.filter(createBpfPredicate('host 1.1.1.1'))).toEqual(packets);
    expect(packets.filter(createBpfPredicate('src host 1.1.1.1'))).toEqual([
      packets[0],
    ]);
    expect(packets.filter(createBpfPredicate('dst host 1.1.1.1'))).toEqual([
      packets[1],
    ]);
  });

  it('matches port clauses with protocol and direction', () => {
    const packets = [
      basePacket({ sport: 80, dport: 1234 }),
      basePacket({ index: 2, protocol: 17, sport: 53, dport: 53 }),
    ];
    expect(packets.filter(createBpfPredicate('port 80'))).toEqual([packets[0]]);
    expect(packets.filter(createBpfPredicate('src port 53'))).toEqual([packets[1]]);
    expect(packets.filter(createBpfPredicate('tcp port 80'))).toEqual([packets[0]]);
    expect(packets.filter(createBpfPredicate('udp port 80'))).toEqual([]);
  });

  it('supports compound OR and AND expressions', () => {
    const packets = [
      basePacket({ sport: 80, dport: 443 }),
      basePacket({ index: 2, sport: 8080, dport: 53, protocol: 17 }),
      basePacket({ index: 3, src: '8.8.8.8', dport: 53, protocol: 17 }),
    ];
    const orPredicate = createBpfPredicate('tcp.port == 80 || tcp.port == 443');
    expect(packets.filter(orPredicate)).toEqual([packets[0]]);

    const andPredicate = createBpfPredicate('udp and dst port 53 and host 8.8.8.8');
    expect(packets.filter(andPredicate)).toEqual([packets[2]]);
  });

  it('falls back to substring search when no clause matches', () => {
    const packets = [
      basePacket({ info: 'custom rule triggered', index: 5 }),
      basePacket({ info: 'nothing interesting', index: 6 }),
    ];
    const predicate = createBpfPredicate('custom rule');
    expect(packets.filter(predicate)).toEqual([packets[0]]);
  });
});
