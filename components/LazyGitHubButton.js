import React, { useEffect, useRef, useState } from 'react';
import ExternalFrame from './ExternalFrame';

const LazyGitHubButton = ({ user, repo }) => {
  const ref = useRef(null);
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
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="inline-block">
      {visible ? (
        <ExternalFrame
          src={`https://ghbtns.com/github-btn.html?user=${user}&repo=${repo}&type=star&count=true`}
          frameBorder="0"
          scrolling="0"
          width="150"
          height="20"
          title={`${repo}-star`}
        />
      ) : (
        <div className="h-5 w-24 bg-gray-200 animate-pulse rounded"></div>
      )}
    </div>
  );
};

export default LazyGitHubButton;
