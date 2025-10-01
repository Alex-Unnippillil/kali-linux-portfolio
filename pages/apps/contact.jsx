import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const ContactApp = dynamic(() => import('../../apps/contact'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function ContactPage() {
  return <ContactApp />;
}

export default withDeepLinkBoundary('contact', ContactPage);
