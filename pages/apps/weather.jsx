import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const WeatherApp = dynamic(
  () =>
    import('../../apps/weather').catch((err) => {
      console.error('Failed to load Weather app', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

export default withDeepLinkBoundary('weather', WeatherApp);
