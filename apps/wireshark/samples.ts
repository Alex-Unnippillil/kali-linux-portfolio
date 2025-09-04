export interface Sample {
  label: string;
  path: string;
  thumbnail: string;
  description: string;
  source: string;
}

const samples: Sample[] = [
  {
    label: 'HTTP',
    path: '/samples/wireshark/http.pcap',
    thumbnail: '/samples/wireshark/http.svg',
    description: 'Basic HTTP request and response capture',
    source:
      'https://gitlab.com/wireshark/wireshark/-/raw/master/test/captures/http.cap',
  },
  {
    label: 'DNS',
    path: '/samples/wireshark/dns.pcap',
    thumbnail: '/samples/wireshark/dns.svg',
    description: 'DNS query and response traffic',
    source:
      'https://gitlab.com/wireshark/wireshark/-/raw/master/test/captures/dns.cap',
  },
];

export default samples;
