import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

export default function XApp() {
  const [handle, setHandle] = useState('');
  const inputRef = useRef(null);
  const timelineRef = useRef(null);

  const loadTimeline = async (h) => {
    if (!window.twttr || !timelineRef.current) return;
    timelineRef.current.innerHTML = '';
    if (h.includes('/')) {
      const [owner, slug] = h.split('/').map((s) => s.trim());
      await window.twttr.widgets.createTimeline(
        { sourceType: 'list', ownerScreenName: owner, slug },
        timelineRef.current,
        { chrome: 'noheader noborders' }
      );
    } else {
      await window.twttr.widgets.createTimeline(
        { sourceType: 'profile', screenName: h },
        timelineRef.current,
        { chrome: 'noheader noborders' }
      );
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('x-handle') || 'AUnnippillil';
    setHandle(stored);
  }, []);

  useEffect(() => {
    if (handle && window.twttr) loadTimeline(handle);
  }, [handle]);

  const onSearch = (e) => {
    e.preventDefault();
    const value = inputRef.current.value.trim().replace(/^@/, '');
    if (!value) return;
    localStorage.setItem('x-handle', value);
    setHandle(value);
  };

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey flex flex-col">
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
        onLoad={() => handle && loadTimeline(handle)}
      />
      <form
        onSubmit={onSearch}
        className="p-2 flex gap-2 border-b border-gray-600"
      >
        <input
          ref={inputRef}
          defaultValue={handle}
          placeholder="Enter profile or owner/list"
          className="flex-1 p-2 rounded bg-gray-800 text-white"
        />
        <button
          type="submit"
          className="px-4 py-1 bg-blue-500 text-white rounded"
        >
          Load
        </button>
      </form>
      <div id="timeline" ref={timelineRef} className="flex-1" />
    </div>
  );
}

export const displayX = () => <XApp />;
