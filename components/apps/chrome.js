import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ExternalFrame from '../ExternalFrame';

export default function Chrome() {
  const homeUrl = 'https://www.google.com/webhp?igu=1';
  const [url, setUrl] = useState(homeUrl);
  const [displayUrl, setDisplayUrl] = useState(homeUrl);
  const iframeRef = useRef(null);
  const inputRef = useRef(null);
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [loading, setLoading] = useState(true);

  const storeVisitedUrl = (u, d) => {
    try {
      localStorage.setItem('chrome-url', u);
      localStorage.setItem('chrome-display-url', d);
    } catch {
      /* ignore */
    }
  };

  const refreshChrome = useCallback(() => {
    if (!iframeRef.current) return;
    setLoading(true);
    const iframe = iframeRef.current;
    const timer = setTimeout(() => setLoading(false), 10000);
    const handleLoad = () => {
      setLoading(false);
      clearTimeout(timer);
      iframe.removeEventListener('load', handleLoad);
    };
    iframe.addEventListener('load', handleLoad);
    iframe.src = url;
  }, [url]);

  useEffect(() => {
    refreshChrome();
  }, [url, refreshChrome]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const goToHome = () => {
    setUrl(homeUrl);
    setDisplayUrl(homeUrl);
  };

  const checkKey = (e) => {
    if (e.key === 'Enter') {
      let val = e.target.value.trim();
      if (!val.length) return;
      if (!/^https?:\/\//i.test(val)) {
        val = 'https://' + val;
      }
      const display = encodeURI(val);
      setUrl(display);
      setDisplayUrl(display);
      storeVisitedUrl(display, display);
      inputRef.current?.blur();
    }
  };

  const handleDisplayUrl = (e) => {
    setDisplayUrl(e.target.value);
  };

  const tryAgain = () => refreshChrome();

  const displayUrlBar = () => (
    <div className="w-full pt-0.5 pb-1 flex justify-start items-center text-white text-sm border-b border-gray-900">
      <div
        onClick={refreshChrome}
        className=" ml-2 mr-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10"
      >
        <Image
          className="w-5"
          src="/themes/Yaru/status/chrome_refresh.svg"
          alt="Ubuntu Chrome Refresh"
          width={20}
          height={20}
          sizes="20px"
        />
      </div>
      <div
        onClick={goToHome}
        className=" mr-2 ml-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10"
      >
        <Image
          className="w-5"
          src="/themes/Yaru/status/chrome_home.svg"
          alt="Ubuntu Chrome Home"
          width={20}
          height={20}
          sizes="20px"
        />
      </div>
      <input
        ref={inputRef}
        onKeyDown={checkKey}
        onChange={handleDisplayUrl}
        value={displayUrl}
        className="outline-none bg-ub-grey rounded-full pl-3 py-0.5 mr-3 w-5/6 text-gray-300 focus:text-white"
        type="url"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey">
      {displayUrlBar()}
      {!online && (
        <div className="bg-red-600 text-white text-sm p-2 flex justify-between items-center">
          <span>No internet connection.</span>
          <button className="underline" onClick={tryAgain}>
            Try again
          </button>
        </div>
      )}
      {loading && (
        <div className="flex-grow flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <ExternalFrame
        ref={iframeRef}
        src={url}
        title="Ubuntu Chrome Url"
        className={`flex-grow ${loading ? 'hidden' : ''}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

export const displayChrome = () => <Chrome />;
