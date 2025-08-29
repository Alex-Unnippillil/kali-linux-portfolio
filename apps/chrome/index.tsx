'use client';

import { useEffect, useState } from 'react';
import AddressBar from './components/AddressBar';

export default function ChromeApp() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('chrome-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUrl(parsed[parsed.length - 1]);
        }
      }
    } catch {
      // ignore errors
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <AddressBar url={url} onNavigate={setUrl} />
      {url && (
        <iframe src={url} className="flex-1 w-full" title="chrome-content" />
      )}
    </div>
  );
}

