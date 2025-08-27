import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import TabBar, { Tab } from './Chrome/TabBar';
import usePersistentState from '../usePersistentState';

interface ChromeProps {
  setTitle?: (title: string) => void;
}

const HOME_URL = 'https://www.google.com/webhp?igu=1';

const Chrome: React.FC<ChromeProps> = ({ setTitle }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [tabs, setTabs] = usePersistentState('chrome-tabs', [{ url: HOME_URL }]) as [Tab[], (t: Tab[]) => void];
  const [activeIndex, setActiveIndex] = usePersistentState('chrome-active-index', 0) as [number, (n: number) => void];
  const [displayUrl, setDisplayUrl] = useState<string>(tabs[activeIndex]?.url || HOME_URL);
  const [blocked, setBlocked] = useState(false);

  const currentTab = tabs[activeIndex] || { url: HOME_URL };

  useEffect(() => {
    setDisplayUrl(currentTab.url);
    setTitle?.(currentTab.title || currentTab.url);
  }, [activeIndex, currentTab.url, currentTab.title, setTitle]);

  const persistTabs = (nextTabs: Tab[], index: number) => {
    setTabs(nextTabs);
    setActiveIndex(index);
  };

  const updateTab = (index: number, updates: Partial<Tab>) => {
    const next = [...tabs];
    next[index] = { ...next[index], ...updates };
    setTabs(next);
  };

  const navigate = (url: string) => {
    let formatted = url.trim();
    if (!formatted) return;
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = 'https://' + formatted;
    }
    const encoded = encodeURI(formatted);
    updateTab(activeIndex, { url: encoded });
    setDisplayUrl(encoded);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigate((e.target as HTMLInputElement).value);
      (e.target as HTMLInputElement).blur();
    }
  };

  const addTab = () => {
    persistTabs([...tabs, { url: HOME_URL }], tabs.length);
  };

  const closeTab = (index: number) => {
    if (tabs.length === 1) return;
    const nextTabs = tabs.filter((_, i) => i !== index);
    let nextIndex = activeIndex;
    if (index < activeIndex) nextIndex -= 1;
    else if (index === activeIndex) nextIndex = Math.max(0, activeIndex - 1);
    persistTabs(nextTabs, nextIndex);
  };

  const selectTab = (index: number) => {
    if (index === activeIndex) return;
    persistTabs(tabs, index);
  };

  const fetchMeta = async (url: string, index: number) => {
    try {
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const title = doc.querySelector('title')?.innerText || url;
      let iconHref = doc.querySelector("link[rel='icon'], link[rel='shortcut icon']")?.getAttribute('href');
      const favicon = iconHref ? new URL(iconHref, url).href : `https://www.google.com/s2/favicons?domain_url=${url}`;
      updateTab(index, { title, favicon });
      if (index === activeIndex) setTitle?.(title);
    } catch {
      const favicon = `https://www.google.com/s2/favicons?domain_url=${url}`;
      updateTab(index, { title: url, favicon });
    }
  };

  useEffect(() => {
    fetchMeta(currentTab.url, activeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab.url, activeIndex]);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let blockedFrame = false;
    try {
      const href = iframe.contentWindow?.location.href;
      if (href === 'about:blank' || href?.startsWith('about:blank')) {
        blockedFrame = true;
      }
    } catch {
      // ignore cross-origin errors
    }
    setBlocked(blockedFrame);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey relative">
      <TabBar tabs={tabs} activeIndex={activeIndex} onSelect={selectTab} onAdd={addTab} onClose={closeTab} />
      <div className="w-full pt-0.5 pb-1 flex justify-start items-center text-white text-sm border-b border-gray-900">
        <div
          onClick={() => {
            const iframe = iframeRef.current;
            if (iframe) iframe.src = iframe.src;
          }}
          className=" ml-2 mr-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10"
        >
          <Image className="w-5" src="/themes/Yaru/status/chrome_refresh.svg" alt="Ubuntu Chrome Refresh" width={20} height={20} sizes="20px" />
        </div>
        <div
          onClick={() => {
            updateTab(activeIndex, { url: HOME_URL });
            setDisplayUrl(HOME_URL);
          }}
          className=" mr-2 ml-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10"
        >
          <Image className="w-5" src="/themes/Yaru/status/chrome_home.svg" alt="Ubuntu Chrome Home" width={20} height={20} sizes="20px" />
        </div>
        <input
          onKeyDown={handleKey}
          onChange={(e) => setDisplayUrl(e.target.value)}
          value={displayUrl}
          id="chrome-url-bar"
          className="outline-none bg-ub-grey rounded-full pl-3 py-0.5 mr-3 w-5/6 text-gray-300 focus:text-white"
          type="url"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div className="flex-grow relative">
        {!blocked && (
          <iframe
            ref={iframeRef}
            src={currentTab.url}
            className="w-full h-full"
            frameBorder="0"
            title="Ubuntu Chrome Url"
            onLoad={handleIframeLoad}
          ></iframe>
        )}
        {blocked && (
          <div className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center space-y-2">
            <img
              src={currentTab.favicon || `https://www.google.com/s2/favicons?domain_url=${currentTab.url}`}
              alt="favicon"
              className="w-8 h-8"
            />
            <p>{currentTab.title || currentTab.url}</p>
            <a
              href={currentTab.url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 underline"
            >
              Open externally
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chrome;

export const displayChrome = (addFolder?: any, openApp?: any, setTitle?: (title: string) => void) => {
  return <Chrome setTitle={setTitle} />;
};
