"use client";

import { useState } from 'react';
import AddressBar from './components/AddressBar';
import FullPageCapture from './components/FullPageCapture';
import ReadingMode from './components/ReadingMode';
import TabSkeleton from './components/TabSkeleton';

type Mode = 'browse' | 'capture' | 'reader';

export default function ChromeApp() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('browse');

  const navigate = (nextUrl: string) => {
    if (!nextUrl) return;
    setUrl(nextUrl);
    setLoading(true);
    setMode('browse');
  };

  return (
    <div className="flex flex-col h-full">
      <AddressBar url={url} onNavigate={navigate} />
      <div className="flex space-x-2 bg-gray-100 p-2">
        <button
          type="button"
          onClick={() => setMode('browse')}
          className="px-2 border rounded"
        >
          Web
        </button>
        <button
          type="button"
          onClick={() => setMode('capture')}
          className="px-2 border rounded"
        >
          Capture
        </button>
        <button
          type="button"
          onClick={() => setMode('reader')}
          className="px-2 border rounded"
        >
          Reader
        </button>
      </div>
      <div className="flex-1 relative">
        {loading && mode === 'browse' && <TabSkeleton />}
        {mode === 'capture' ? (
          <FullPageCapture />
        ) : mode === 'reader' ? (
          <ReadingMode />
        ) : (
          url && (
            <iframe
              src={url}
              className="w-full h-full"
              title="chrome-content"
              onLoad={() => setLoading(false)}
            />
          )
        )}
      </div>
    </div>
  );
}

