import dynamic from '@/utils/dynamic';

const Metasploit = dynamic(() => import('../../apps/metasploit'));

export default function MetasploitPage() {
  return <Metasploit />;
}
