import dynamic from '@/utils/dynamic';

const MetasploitPost = dynamic(() => import('../../apps/metasploit-post'));

export default function MetasploitPostPage() {
  return <MetasploitPost />;
}
