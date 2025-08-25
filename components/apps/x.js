import { useEffect, useRef } from 'react';

export default function XApp() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    containerRef.current?.appendChild(script);
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto bg-panel">
      <a
        className="twitter-timeline"
        data-chrome="noheader noborders"
        href="https://twitter.com/AUnnippillil"
      >
        Tweets by AUnnippillil
      </a>
    </div>
  );
}

export const displayX = () => <XApp />;

