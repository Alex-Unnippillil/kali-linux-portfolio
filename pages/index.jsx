import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import ThemeToggle from '../components/ui/ThemeToggle';

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
    <footer className="absolute bottom-2 left-0 w-full flex items-center justify-center gap-4 text-xs text-ubt-grey">
      <a
        href="https://github.com/unnippillil/kali-linux-portfolio"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        Source
      </a>
      <ThemeToggle />
    </footer>
  </>
);

export default App;
