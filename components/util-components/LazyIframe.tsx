import React, { useEffect, useRef, useState } from 'react';

export type LazyIframeProps = React.IframeHTMLAttributes<HTMLIFrameElement>;

const LazyIframe: React.FC<LazyIframeProps> = ({ className, ...props }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      });
    });
    const { current } = ref;
    if (current) observer.observe(current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {visible ? (
        <iframe {...props} className="w-full h-full" />
      ) : (
        <div className="w-full h-full bg-gray-700 animate-pulse" />
      )}
    </div>
  );
};

export default LazyIframe;
