import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const MetasploitPost = dynamic(() => import('../../apps/metasploit-post'), {
  ssr: false,
  loading: () => getAppSkeleton('metasploit-post', 'Metasploit Post'),
});

export default function MetasploitPostPage() {
  return <MetasploitPost />;
}
