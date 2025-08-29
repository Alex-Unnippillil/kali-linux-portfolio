export interface FilterPreset {
  label: string;
  expression: string;
}

const presets: FilterPreset[] = [
  { label: 'TCP', expression: 'tcp' },
  { label: 'UDP', expression: 'udp' },
  { label: 'ICMP', expression: 'icmp' },
  { label: 'HTTP', expression: 'http' },
  { label: 'HTTP traffic', expression: 'tcp.port == 80' },
  { label: 'HTTPS traffic', expression: 'tcp.port == 443' },
  { label: 'DNS queries', expression: 'udp.port == 53' },
  { label: 'Host 10.0.0.1', expression: 'ip.addr == 10.0.0.1' }
];

export default presets;
