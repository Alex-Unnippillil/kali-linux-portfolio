import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/metasploit-post');

const MetasploitPost = dynamic(() => import('../../apps/metasploit-post'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MetasploitPostPage() {
  return <MetasploitPost />;
}
