import dynamic from '@/utils/dynamic';

const MetasploitPost = dynamic(() => import('@/apps/metasploit-post'), {
  ssr: false,
});

export default function MetasploitPostPage() {
  return <MetasploitPost />;
}
