export const networkFixtures = [
  {
    id: 'cic-ids2017-http',
    name: 'CIC-IDS2017 – HTTP redirection segment',
    dataset: {
      name: 'CIC-IDS2017',
      url: 'https://www.unb.ca/cic/datasets/ids-2017.html',
      citation:
        'Trimmed from the CIC-IDS2017 infiltration scenario. Times and hosts anonymised for the simulator.',
    },
    summary:
      'Shows a host being poisoned and redirected through an attacker conducting HTTP credential harvesting.',
    hosts: [
      { ip: '192.168.0.1', mac: '00:11:32:aa:bb:01' },
      { ip: '192.168.0.5', mac: '00:11:32:aa:bb:05' },
      { ip: '192.168.0.105', mac: '00:11:32:aa:bb:69' },
      { ip: '172.16.0.50', mac: '00:11:32:aa:bb:32' },
    ],
    flows: [
      {
        timestamp: '00:00:01.214',
        source: '192.168.0.105',
        destination: '192.168.0.1',
        protocol: 'ARP',
        info: 'Who has 192.168.0.1? Tell 192.168.0.105',
      },
      {
        timestamp: '00:00:01.328',
        source: '00:11:32:aa:bb:32',
        destination: '192.168.0.105',
        protocol: 'ARP',
        info: '192.168.0.1 is-at 00:11:32:aa:bb:32 (spoofed)',
      },
      {
        timestamp: '00:00:04.912',
        source: '192.168.0.105',
        destination: '172.16.0.50',
        protocol: 'HTTP',
        info: 'GET /login HTTP/1.1',
      },
      {
        timestamp: '00:00:05.067',
        source: '172.16.0.50',
        destination: '192.168.0.105',
        protocol: 'HTTP',
        info: '200 OK (credential capture form)',
      },
      {
        timestamp: '00:00:07.443',
        source: '172.16.0.50',
        destination: '192.168.0.5',
        protocol: 'TCP',
        info: 'POST /session-store (exfiltration)',
      },
    ],
    samplePackets: [
      'ARP reply: 192.168.0.1 is-at 00:11:32:aa:bb:32',
      'HTTP GET /login host portal.example',
      'HTTP POST /session-store credentials user=alice&pass=demo',
    ],
    filterSamples: [
      {
        name: 'Block HTTP POST exfiltration',
        code: "if (ip.proto == 'TCP' && tcp.method == 'POST') {\n  drop();\n}",
      },
      {
        name: 'Allow DNS',
        code: "if (udp.port == 53) {\n  pass();\n}",
      },
    ],
    recommendedFlags: ['-T', '-M arp:remote', '-F post-block.ecf'],
  },
  {
    id: 'mawi-dns-spoof',
    name: 'MAWI Lab – DNS spoof drill',
    dataset: {
      name: 'MAWI Working Group Traffic Archive',
      url: 'https://mawi.wide.ad.jp/mawi/',
      citation:
        'Adapted from MAWI sample 2020-12. Payload strings replaced with neutral examples for teaching.',
    },
    summary:
      'Highlights DNS spoofing attempts followed by suspicious TLS certificate delivery.',
    hosts: [
      { ip: '10.0.0.1', mac: '00:25:90:cc:10:01' },
      { ip: '10.0.0.24', mac: '00:25:90:cc:10:18' },
      { ip: '203.0.113.40', mac: '00:25:90:cc:10:28' },
      { ip: '198.51.100.77', mac: '00:25:90:cc:10:77' },
    ],
    flows: [
      {
        timestamp: '00:00:12.004',
        source: '10.0.0.24',
        destination: '10.0.0.1',
        protocol: 'ARP',
        info: 'Who has 10.0.0.1? Tell 10.0.0.24',
      },
      {
        timestamp: '00:00:12.051',
        source: '10.0.0.1',
        destination: '10.0.0.24',
        protocol: 'ARP',
        info: '10.0.0.1 is-at 00:25:90:cc:10:01',
      },
      {
        timestamp: '00:00:13.488',
        source: '198.51.100.77',
        destination: '10.0.0.24',
        protocol: 'DNS',
        info: 'Spoofed answer portal.example -> 203.0.113.40',
      },
      {
        timestamp: '00:00:14.102',
        source: '203.0.113.40',
        destination: '10.0.0.24',
        protocol: 'TLS',
        info: 'Suspicious certificate delivery',
      },
      {
        timestamp: '00:00:15.332',
        source: '10.0.0.24',
        destination: '198.51.100.77',
        protocol: 'ICMP',
        info: 'ICMP echo request verifying spoof',
      },
    ],
    samplePackets: [
      'DNS answer portal.example 60 IN A 203.0.113.40',
      'TLS certificate CN=attacker.example',
      'ICMP echo request 10.0.0.24 -> 198.51.100.77',
    ],
    filterSamples: [
      {
        name: 'Alert on spoofed DNS',
        code: "if (udp.port == 53 && dns.answer.ip == '203.0.113.40') {\n  alert('Suspicious DNS response');\n}",
      },
      {
        name: 'Drop rogue TLS certs',
        code: "if (tls.cn == 'attacker.example') {\n  drop();\n}",
      },
    ],
    recommendedFlags: ['-T', '-M arp:remote', '--plugin dns_spoof'],
  },
];

export const defaultFilterSamples = networkFixtures[0].filterSamples;
export const defaultPackets = networkFixtures[0].samplePackets;

export default networkFixtures;
