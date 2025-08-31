import dynamic from '@/utils/dynamic';

const Metasploit = dynamic(() => import('@/apps/metasploit'), {
  ssr: false,
});

export default function MetasploitPage() {
  return <Metasploit />;
}
