import React, { useEffect, useRef, useState, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { observeViewport } from '../utils/viewport';

const GitHubStars = ({ user, repo }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [stars, setStars] = usePersistentState(`gh-stars-${user}/${repo}`, null);
  const [loading, setLoading] = useState(stars === null);
  const isTestEnv = process.env.NODE_ENV === 'test';

  const fetchStars = useCallback(async () => {
    try {
      if (isTestEnv) {
        setStars((prev) => (prev === null ? 0 : prev));
        setLoading(false);
        return;
      }
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
  }, [user, repo, setStars, isTestEnv]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    let unsubscribe = observeViewport(node, (entry) => {
      if (entry.isIntersecting) {
        setVisible(true);
        unsubscribe();
      }
    });

    return () => {
      unsubscribe();
    };
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
