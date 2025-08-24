import React, { useEffect, useRef, useState } from 'react';

interface LazyGitHubButtonProps {
  user: string;
  repo: string;
}

const LazyGitHubButton: React.FC<LazyGitHubButtonProps> = ({ user, repo }) => {
  const ref = useRef<HTMLDivElement | null>(null);
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
    const current = ref.current;
    if (current) {
      observer.observe(current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="inline-block">
      {visible ? (
        <iframe
          src={`https://ghbtns.com/github-btn.html?user=${user}&repo=${repo}&type=star&count=true`}
          frameBorder="0"
          scrolling="0"
          width="150"
          height="20"
          title={`${repo}-star`}
        ></iframe>
      ) : (
        <div className="h-5 w-24 bg-gray-200 animate-pulse rounded"></div>
      )}
    </div>
  );
};

export default LazyGitHubButton;
