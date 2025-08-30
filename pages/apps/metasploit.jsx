import dynamic from 'next/dynamic';

const Metasploit = dynamic(() => import('../../apps/metasploit'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function MetasploitPage() {
  return <Metasploit />;
}
