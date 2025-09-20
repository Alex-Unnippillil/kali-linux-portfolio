import dynamic from 'next/dynamic';
import Image from 'next/image';
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
    loading: () => (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <Image
          src="/assets/branding/kali-dragon.svg"
          alt="Kali Linux dragon logo"
          width={256}
          height={256}
          className="w-28 h-28 sm:w-36 sm:h-36 drop-shadow-[0_12px_24px_rgba(9,30,66,0.45)]"
          priority
          sizes="(max-width: 640px) 112px, 144px"
        />
        <p className="mt-6 text-xs uppercase tracking-[0.35em] text-ubt-blue/80">Loading desktop…</p>
      </div>
    ),
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
