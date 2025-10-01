import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const Metasploit = dynamic(() => import('../../apps/metasploit'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function MetasploitPage() {
  return <Metasploit />;
}

export default withDeepLinkBoundary('metasploit', MetasploitPage);
