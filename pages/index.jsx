import dynamic from 'next/dynamic';
import Image from 'next/image';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';

const KaliLoadingSplash = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
    <Image
      src="/assets/branding/kali-dragon.svg"
      alt="Kali Linux dragon logo"
      width={256}
      height={256}
      className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40"
      priority
      sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 160px"
    />
    <p className="mt-6 text-sm text-white/80">Loading desktop experience...</p>
  </div>
);

const Ubuntu = dynamic(
  () =>
    import('../components/ubuntu').catch((err) => {
      console.error('Failed to load Ubuntu component', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <KaliLoadingSplash />,
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
  </>
);

export default App;
