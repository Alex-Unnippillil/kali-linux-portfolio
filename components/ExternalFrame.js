import React, { useEffect, useRef, useState } from 'react';

const ExternalFrame = ({ src, allowlist = [], className = '', title, id, ...rest }) => {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (allowlist.length && !allowlist.some((allowed) => src && src.startsWith(allowed))) {
      setError('URL not allowlisted');
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);
    let loaded = false;
    const handleLoad = () => {
      loaded = true;
      setLoading(false);
    };
    const frame = iframeRef.current;
    frame && frame.addEventListener('load', handleLoad);
    const timer = setTimeout(() => {
      if (!loaded) {
        setError('Failed to load');
        setLoading(false);
      }
    }, 10000);
    return () => {
      frame && frame.removeEventListener('load', handleLoad);
      clearTimeout(timer);
    };
  }, [src, allowlist, reloadKey]);

  return (
    <div className="relative h-full w-full">
      {!online && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-black text-sm p-1 flex justify-center items-center z-10">
          <span className="mr-2">You are offline.</span>
          <button className="underline" onClick={retry}>Retry</button>
        </div>
      )}
      {error && (
        <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
          {error}
        </div>
      )}
      {!error && (
        <>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-ub-cool-grey text-white">
              Loading...
            </div>
          )}
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={src}
            id={id}
            title={title}
            className={className}
            {...rest}
          />
        </>
      )}
    </div>
  );
};

export default ExternalFrame;
