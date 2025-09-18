import dynamic from 'next/dynamic';

const HelpHubApp = dynamic(() => import('../../components/apps/help-hub'), {
  ssr: false,
  loading: () => <p>Loading Help Hub...</p>,
});

export default HelpHubApp;
