import { useEffect } from 'react';
import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import '../styles/index.css';
import '../styles/resume-print.css';
import '@xterm/xterm/css/xterm.css';
import { SettingsProvider } from '../hooks/useSettings';
import SimulationBanner from '../components/SimulationBanner';

/**
 * @param {import('next/app').AppProps} props
 */
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const block = () =>
        Promise.reject(new Error('Network access disabled in simulation'));
      window.fetch = block;
      window.XMLHttpRequest = function () {
        throw new Error('Network access disabled in simulation');
      };
      window.WebSocket = function () {
        throw new Error('Network access disabled in simulation');
      };
    }
  }, []);
  return (
    <SettingsProvider>
      <SimulationBanner />
      <Component {...pageProps} />
    </SettingsProvider>
  );
}

export default MyApp;
