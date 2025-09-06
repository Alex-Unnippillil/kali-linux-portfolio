import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SettingsApp = dynamic(() => import('../../../apps/settings'), {
  ssr: false,
});
const DateTimeSettings = dynamic(() => import('./date-time'), {
  ssr: false,
});
const IconSettings = dynamic(() => import('./icons'), {
  ssr: false,
});
const FontSettings = dynamic(() => import('./fonts'), {
  ssr: false,
});
const DpiSettings = dynamic(() => import('./dpi'), {
  ssr: false,
});
const MouseSettings = dynamic(() => import('./mouse'), {
  ssr: false,
});

export default function SettingsPage() {
  const [hash, setHash] = useState('');

  useEffect(() => {
    const handle = () => setHash(window.location.hash.slice(1));
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  switch (hash) {
    case 'datetime':
      return <DateTimeSettings />;
    case 'icons':
      return <IconSettings />;
    case 'fonts':
      return <FontSettings />;
    case 'dpi':
      return <DpiSettings />;
    case 'mouse':
      return <MouseSettings />;
    default:
      return <SettingsApp />;
  }
}

