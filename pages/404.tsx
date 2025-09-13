import dynamic from 'next/dynamic';
import { useCallback } from 'react';
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
  },
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
  },
);

const NotFoundPage = () => {
  const openHelp = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'terminal' }));
    setTimeout(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'p' }),
      );
    }, 100);
  }, []);

  return (
    <>
      <a href="#window-area" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <Meta title="404: command not found" />
      <Ubuntu />
      <BetaBadge />
      <InstallButton />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <p className="text-white text-lg">
          command not found. Try{' '}
          <button
            type="button"
            onClick={openHelp}
            className="underline pointer-events-auto"
          >
            help
          </button>
          .
        </p>
      </div>
    </>
  );
};

export default NotFoundPage;
