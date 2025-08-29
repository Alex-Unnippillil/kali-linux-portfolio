export interface FilterPreset {
  label: string;
  expression: string;
  docUrl: string;
}

const presets: FilterPreset[] = [
  {
    label: 'TCP',
    expression: 'tcp',
    docUrl: 'https://www.wireshark.org/docs/dfref/t/tcp.html',
  },
  {
    label: 'UDP',
    expression: 'udp',
    docUrl: 'https://www.wireshark.org/docs/dfref/u/udp.html',
  },
  {
    label: 'ICMP',
    expression: 'icmp',
    docUrl: 'https://www.wireshark.org/docs/dfref/i/icmp.html',
  },
  {
    label: 'HTTP',
    expression: 'http',
    docUrl: 'https://www.wireshark.org/docs/dfref/h/http.html',
  },
  {
    label: 'HTTP traffic',
    expression: 'tcp.port == 80',
    docUrl: 'https://www.wireshark.org/docs/dfref/t/tcp.html',
  },
  {
    label: 'HTTPS traffic',
    expression: 'tcp.port == 443',
    docUrl: 'https://www.wireshark.org/docs/dfref/t/tcp.html',
  },
  {
    label: 'DNS queries',
    expression: 'udp.port == 53',
    docUrl: 'https://www.wireshark.org/docs/dfref/u/udp.html',
  },
  {
    label: 'Host 10.0.0.1',
    expression: 'ip.addr == 10.0.0.1',
    docUrl: 'https://www.wireshark.org/docs/dfref/i/ip.html',
  },
];

export default presets;
