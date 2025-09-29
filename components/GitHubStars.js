import React, { useEffect, useRef, useState, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';

const GitHubStars = ({ user, repo }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [stars, setStars] = usePersistentState(`gh-stars-${user}/${repo}`, null);
  const [loading, setLoading] = useState(stars === null);
  const etagRef = useRef(null);

  const fetchStars = useCallback(async () => {
    if (!user || !repo) return;
    try {
      setLoading(true);
      const headers = {};
      if (etagRef.current) {
        headers['If-None-Match'] = etagRef.current;
      }

      const res = await fetch(`/api/github-stars?user=${encodeURIComponent(user)}&repo=${encodeURIComponent(repo)}`, {
        headers,
      });

      const nextEtag = res.headers.get('ETag');
      if (nextEtag) {
        etagRef.current = nextEtag;
      }

      if (res.status === 304) {
        return;
      }

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (typeof data?.stars === 'number') {
        setStars(data.stars);
      }
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
    <div ref={ref} className="inline-flex items-center text-xs text-gray-300">
      {loading ? (
        <div className="h-5 w-12 bg-gray-200 animate-pulse rounded" />
      ) : (
        <>
          <span>⭐ {stars}</span>
          <button
            onClick={fetchStars}
            aria-label="Refresh star count"
            className="ml-2 text-gray-400 hover:text-white"
          >
            ↻
          </button>
        </>
      )}
    </div>
  );
};

export default GitHubStars;

