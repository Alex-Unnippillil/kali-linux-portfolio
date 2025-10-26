import { PacketTemplate } from './types';

export const PACKET_TEMPLATES: PacketTemplate[] = [
  {
    id: 'http-get-demo',
    name: 'HTTP GET (IPv4/TCP)',
    description: 'A simple HTTP GET request travelling over Ethernet, IPv4, and TCP.',
    tags: ['ethernet', 'ipv4', 'tcp', 'http'],
    layers: [
      {
        type: 'ethernet',
        fields: {
          srcMac: 'de:ad:be:ef:12:34',
          dstMac: '00:15:5d:00:04:01',
          etherType: '0x0800 (IPv4)',
        },
      },
      {
        type: 'ipv4',
        fields: {
          version: '4',
          headerLength: '20',
          tos: '0x00',
          totalLength: '60',
          identification: '0x1c46',
          flags: 'DF',
          fragmentOffset: '0',
          ttl: '64',
          protocol: '6 (TCP)',
          headerChecksum: '0x0000',
          srcIp: '192.168.56.101',
          dstIp: '93.184.216.34',
        },
      },
      {
        type: 'tcp',
        fields: {
          srcPort: '49512',
          dstPort: '80',
          sequenceNumber: '0',
          acknowledgmentNumber: '0',
          dataOffset: '10',
          flags: 'SYN',
          windowSize: '64240',
          checksum: '0x0000',
          urgentPointer: '0',
          options: 'MSS=1460,SACK permitted,TSval=0,TSecr=0',
        },
      },
      {
        type: 'http',
        fields: {
          method: 'GET',
          path: '/',
          host: 'example.com',
          userAgent: 'Kali Portfolio PacketCrafter',
          accept: 'text/html,application/xhtml+xml',
          acceptLanguage: 'en-US',
          additionalHeaders: 'Connection: keep-alive',
        },
      },
    ],
  },
  {
    id: 'dns-a-query',
    name: 'DNS Query (A record)',
    description: 'A recursive DNS lookup for demo.unnippillil.com using UDP.',
    tags: ['ethernet', 'ipv4', 'udp', 'dns'],
    layers: [
      {
        type: 'ethernet',
        fields: {
          srcMac: '52:54:00:12:34:56',
          dstMac: '08:00:27:44:55:66',
          etherType: '0x0800 (IPv4)',
        },
      },
      {
        type: 'ipv4',
        fields: {
          version: '4',
          headerLength: '20',
          tos: '0x00',
          totalLength: '50',
          identification: '0x1337',
          flags: 'RD',
          fragmentOffset: '0',
          ttl: '64',
          protocol: '17 (UDP)',
          headerChecksum: '0x0000',
          srcIp: '10.10.14.24',
          dstIp: '1.1.1.1',
        },
      },
      {
        type: 'udp',
        fields: {
          srcPort: '53341',
          dstPort: '53',
          length: '30',
          checksum: '0x0000',
        },
      },
      {
        type: 'dns',
        fields: {
          transactionId: '0xbeef',
          flags: '0x0100 (standard query)',
          questions: '1',
          answers: '0',
          authority: '0',
          additional: '0',
          queryName: 'demo.unnippillil.com',
          queryType: 'A',
          queryClass: 'IN',
          recursionDesired: 'true',
        },
      },
    ],
  },
  {
    id: 'icmp-echo',
    name: 'ICMP Echo Request',
    description: 'A classic ping request with a friendly payload.',
    tags: ['ethernet', 'ipv4', 'icmp'],
    layers: [
      {
        type: 'ethernet',
        fields: {
          srcMac: '00:0c:29:ab:cd:ef',
          dstMac: 'ff:ff:ff:ff:ff:ff',
          etherType: '0x0800 (IPv4)',
        },
      },
      {
        type: 'ipv4',
        fields: {
          version: '4',
          headerLength: '20',
          tos: '0x00',
          totalLength: '42',
          identification: '0x0040',
          flags: 'DF',
          fragmentOffset: '0',
          ttl: '64',
          protocol: '1 (ICMP)',
          headerChecksum: '0x0000',
          srcIp: '192.168.0.4',
          dstIp: '192.168.0.1',
        },
      },
      {
        type: 'icmp',
        fields: {
          type: '8 (Echo Request)',
          code: '0',
          checksum: '0x0000',
          identifier: '0x00ff',
          sequenceNumber: '0x0001',
          payload: '48656c6c6f2066726f6d204b616c6920506f7274666f6c696f21',
        },
      },
    ],
  },
];

export const DEFAULT_PACKET_TEMPLATE_ID = PACKET_TEMPLATES[0]?.id ?? '';
