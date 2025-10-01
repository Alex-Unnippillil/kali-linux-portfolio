import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const MetasploitPost = dynamic(() => import('../../apps/metasploit-post'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function MetasploitPostPage() {
  return <MetasploitPost />;
}

export default withDeepLinkBoundary('metasploit-post', MetasploitPostPage);
