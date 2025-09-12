import dynamic from 'next/dynamic';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import Script from 'next/script';

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
    <header>
      <nav className="wswitch">
        <a href="#about">About</a>
        <a href="#projects">Projects</a>
        <a href="#blog">Blog</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
    <main>
      <section id="about">
        <h2>About</h2>
      </section>
      <section id="projects">
        <h2>Projects</h2>
      </section>
      <section id="blog">
        <h2>Blog</h2>
      </section>
      <section id="contact">
        <h2>Contact</h2>
      </section>
    </main>
    <Ubuntu />
    <BetaBadge />
    <InstallButton />
    <Script src="/kali-ui.js" strategy="lazyOnload" />
  </>
);

export default App;
