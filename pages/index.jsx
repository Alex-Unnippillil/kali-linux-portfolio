import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';

const Ubuntu = dynamic(
  () =>
    import('../components/ubuntu').catch((err) => {
      console.error('Failed to load Ubuntu component', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading Ubuntu...</p>,
  }
);
const InstallButton = dynamic(
  () =>
    import('../components/InstallButton').catch((err) => {
      console.error('Failed to load InstallButton component', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading install options...</p>,
  }
);
const ServiceWorkerProvider = dynamic(
  () => import('../app/components/ServiceWorkerProvider'),
  { ssr: false }
);
const BadgeControls = dynamic(
  () => import('../app/components/badge/BadgeControls'),
  { ssr: false }
);
const PushSubscribeButton = dynamic(
  () => import('../app/components/push/PushSubscribeButton'),
  { ssr: false }
);
const FileHandlerListener = dynamic(
  () => import('../app/components/file/FileHandlerListener'),
  { ssr: false }
);

/**
 * @returns {JSX.Element}
 */
const App = () => (
  <>
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta />
    <Ubuntu />
    <BetaBadge />
    <InstallButton />
    <ServiceWorkerProvider>
      <BadgeControls />
      <PushSubscribeButton />
      <FileHandlerListener />
    </ServiceWorkerProvider>
  </>
);

export default App;
