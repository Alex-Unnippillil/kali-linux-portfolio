import dynamic from 'next/dynamic';

const MetasploitPost = dynamic(() => import('../../apps/metasploit-post'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MetasploitPostPage() {
  return <MetasploitPost />;
}
