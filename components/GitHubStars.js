import React, { useEffect, useRef, useState, useCallback } from 'react';
import usePersistentState from './usePersistentState';

const GitHubStars = ({ user, repo }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [stars, setStars] = usePersistentState(`gh-stars-${user}/${repo}`, null);
  const [loading, setLoading] = useState(stars === null);

  const fetchStars = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://api.github.com/repos/${user}/${repo}`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setStars(data.stargazers_count || 0);
    } catch (e) {
      console.error('Failed to fetch star count', e);
    } finally {
      setLoading(false);
    }
  }, [user, repo, setStars]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      });
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (stars === null) {
      fetchStars();
    }
  }, [visible, stars, fetchStars]);

  if (!repo) return null;

  return (
    <div ref={ref} className="inline-flex items-center text-xs text-ubt-grey">
      {loading ? (
        <div className="h-5 w-12 bg-gray-200 animate-pulse rounded" />
      ) : (
        <>
          <span>⭐ {stars}</span>
          <button
            onClick={fetchStars}
            aria-label="Refresh star count"
            className={[
              "ml-2 text-ubt-grey hover:text-white",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outline-color)]",
            ].join(" ")}
          >
            ↻
          </button>
        </>
      )}
    </div>
  );
};

export default GitHubStars;

