import type { CaptureSnapshot } from '../../../utils/network/packetSerializer';

const handshake: CaptureSnapshot = {
  version: 1,
  frames: [
    {
      timestamp: '0.000001',
      src: '10.0.0.1',
      dest: '10.0.0.2',
      protocol: 6,
      info: 'TCP SYN',
      sport: 12345,
      dport: 80,
      data: '3q2+7wE=',
      layers: [
        {
          name: 'Ethernet',
          fields: {
            Destination: 'ff:ee:dd:cc:bb:aa',
            Source: 'aa:bb:cc:dd:ee:ff',
            Type: '0x0800',
          },
        },
        {
          name: 'IPv4',
          fields: {
            Source: '10.0.0.1',
            Destination: '10.0.0.2',
            Protocol: 'TCP',
          },
        },
        {
          name: 'TCP',
          fields: {
            'Source Port': '12345',
            'Destination Port': '80',
            Flags: 'SYN',
          },
        },
      ],
    },
    {
      timestamp: '0.000245',
      src: '10.0.0.2',
      dest: '10.0.0.1',
      protocol: 6,
      info: 'TCP SYN-ACK',
      sport: 80,
      dport: 12345,
      data: '3q2+7wI=',
      layers: [
        {
          name: 'Ethernet',
          fields: {
            Destination: 'aa:bb:cc:dd:ee:ff',
            Source: 'ff:ee:dd:cc:bb:aa',
            Type: '0x0800',
          },
        },
        {
          name: 'IPv4',
          fields: {
            Source: '10.0.0.2',
            Destination: '10.0.0.1',
            Protocol: 'TCP',
          },
        },
        {
          name: 'TCP',
          fields: {
            'Source Port': '80',
            'Destination Port': '12345',
            Flags: 'SYN-ACK',
          },
        },
      ],
    },
    {
      timestamp: '0.000512',
      src: '10.0.0.1',
      dest: '10.0.0.2',
      protocol: 6,
      info: 'TCP ACK',
      sport: 12345,
      dport: 80,
      data: '3q2+7wM=',
      layers: [
        {
          name: 'Ethernet',
          fields: {
            Destination: 'ff:ee:dd:cc:bb:aa',
            Source: 'aa:bb:cc:dd:ee:ff',
            Type: '0x0800',
          },
        },
        {
          name: 'IPv4',
          fields: {
            Source: '10.0.0.1',
            Destination: '10.0.0.2',
            Protocol: 'TCP',
          },
        },
        {
          name: 'TCP',
          fields: {
            'Source Port': '12345',
            'Destination Port': '80',
            Flags: 'ACK',
          },
        },
      ],
    },
  ],
};

const dnsLookup: CaptureSnapshot = {
  version: 1,
  frames: [
    {
      timestamp: '5.010000',
      src: '10.0.0.5',
      dest: '8.8.8.8',
      protocol: 17,
      info: 'Standard query A example.com',
      sport: 53000,
      dport: 53,
      data: 'qrvM3Q==',
      layers: [
        {
          name: 'Ethernet',
          fields: {
            Destination: '44:55:66:77:88:99',
            Source: '99:88:77:66:55:44',
            Type: '0x0800',
          },
        },
        {
          name: 'IPv4',
          fields: {
            Source: '10.0.0.5',
            Destination: '8.8.8.8',
            Protocol: 'UDP',
          },
        },
        {
          name: 'UDP',
          fields: {
            'Source Port': '53000',
            'Destination Port': '53',
          },
        },
        {
          name: 'DNS',
          fields: {
            Query: 'example.com',
            Type: 'A',
          },
        },
      ],
    },
    {
      timestamp: '5.012000',
      src: '8.8.8.8',
      dest: '10.0.0.5',
      protocol: 17,
      info: 'Standard query response A example.com 93.184.216.34',
      sport: 53,
      dport: 53000,
      data: 'qrvM3g==',
      layers: [
        {
          name: 'Ethernet',
          fields: {
            Destination: '99:88:77:66:55:44',
            Source: '44:55:66:77:88:99',
            Type: '0x0800',
          },
        },
        {
          name: 'IPv4',
          fields: {
            Source: '8.8.8.8',
            Destination: '10.0.0.5',
            Protocol: 'UDP',
          },
        },
        {
          name: 'UDP',
          fields: {
            'Source Port': '53',
            'Destination Port': '53000',
          },
        },
        {
          name: 'DNS',
          fields: {
            Answer: '93.184.216.34',
            TTL: '300',
          },
        },
      ],
    },
  ],
};

const icmpPing: CaptureSnapshot = {
  version: 1,
  frames: [
    {
      timestamp: '10.000000',
      src: '192.168.0.10',
      dest: '192.168.0.1',
      protocol: 1,
      info: 'Echo (ping) request id=0x1 seq=1',
      data: 'CAD3/w==',
      layers: [
        {
          name: 'Ethernet',
          fields: {
            Destination: '00:11:22:33:44:55',
            Source: '66:77:88:99:aa:bb',
            Type: '0x0800',
          },
        },
        {
          name: 'IPv4',
          fields: {
            Source: '192.168.0.10',
            Destination: '192.168.0.1',
            Protocol: 'ICMP',
          },
        },
        {
          name: 'ICMP',
          fields: {
            Type: '8',
            Code: '0',
            Identifier: '0x0001',
            Sequence: '1',
          },
        },
      ],
    },
    {
      timestamp: '10.001200',
      src: '192.168.0.1',
      dest: '192.168.0.10',
      protocol: 1,
      info: 'Echo (ping) reply id=0x1 seq=1',
      data: 'AAD6zg==',
      layers: [
        {
          name: 'Ethernet',
          fields: {
            Destination: '66:77:88:99:aa:bb',
            Source: '00:11:22:33:44:55',
            Type: '0x0800',
          },
        },
        {
          name: 'IPv4',
          fields: {
            Source: '192.168.0.1',
            Destination: '192.168.0.10',
            Protocol: 'ICMP',
          },
        },
        {
          name: 'ICMP',
          fields: {
            Type: '0',
            Code: '0',
            Identifier: '0x0001',
            Sequence: '1',
          },
        },
      ],
    },
  ],
};

export const captureTemplates: Record<string, CaptureSnapshot> = {
  handshake,
  dnsLookup,
  icmpPing,
};

export type CaptureTemplateName = keyof typeof captureTemplates;

export default captureTemplates;
