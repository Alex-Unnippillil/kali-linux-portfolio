import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/metasploit');

const Metasploit = dynamic(() => import('../../apps/metasploit'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MetasploitPage() {
  return <Metasploit />;
}
