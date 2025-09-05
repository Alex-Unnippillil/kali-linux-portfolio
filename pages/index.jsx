import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import useSession from '../hooks/useSession';

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
const App = () => {
  const { session, setSession } = useSession();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.panelProfiles = {
      save(name) {
        try {
          localStorage.setItem(
            `panel-profile:${name}`,
            JSON.stringify(session),
          );
          return true;
        } catch (err) {
          console.error('Failed to save panel profile', err);
          return false;
        }
      },
      load(name) {
        try {
          const data = localStorage.getItem(`panel-profile:${name}`);
          if (!data) return false;
          const profile = JSON.parse(data);
          setSession(profile);
          window.location.reload();
          return true;
        } catch (err) {
          console.error('Failed to load panel profile', err);
          return false;
        }
      },
    };
  }, [session, setSession]);

  return (
    <>
      <a href="#window-area" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <Meta />
      <Ubuntu session={session} setSession={setSession} />
      <BetaBadge />
      <InstallButton />
    </>
  );
};

export default App;
