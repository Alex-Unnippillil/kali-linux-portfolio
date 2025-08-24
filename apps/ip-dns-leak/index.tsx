import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IP/DNS Leak',
  description: 'Detect public IP and DNS resolver exposure and generate a report.',
};

export { default, displayIpDnsLeak } from '../../components/apps/ip-dns-leak';
