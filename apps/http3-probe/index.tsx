import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'HTTP/3 Probe',
  description: 'Inspect Alt-Svc and ALPN hints and optionally probe HTTP/3 support.',
};
export { default } from '../../components/apps/http3-probe';
