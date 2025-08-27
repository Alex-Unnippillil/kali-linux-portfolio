import React, { useEffect, useRef, useState } from 'react';

interface ExternalFrameProps {
  title: string;
  src: string;
  allow?: string;
}

export default function ExternalFrame({ title, src, allow }: ExternalFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (offline) return;
    const iframe = iframeRef.current;
    const timer = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 10000);
    const handleLoad = () => {
      clearTimeout(timer);
      setLoading(false);
    };
    iframe?.addEventListener('load', handleLoad);
    return () => {
      clearTimeout(timer);
      iframe?.removeEventListener('load', handleLoad);
    };
  }, [src, offline]);

  const reload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setLoading(true);
      setError(false);
    }
  };

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        {`Failed to load ${title}`}
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-ub-cool-grey">
      {offline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black bg-opacity-80 text-white">
          <p className="mb-2">You are offline</p>
          <button
            onClick={reload}
            className="px-4 py-1 bg-ub-grey rounded hover:bg-ub-drk-abrgn"
          >
            Try again
          </button>
        </div>
      )}
      {loading && !offline && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          Loading...
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        allow={allow}
        className={`h-full w-full ${loading ? 'invisible' : ''}`}
        frameBorder="0"
      />
    </div>
  );
}

