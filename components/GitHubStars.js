import React, { useEffect, useRef, useState, useCallback, forwardRef } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { useIntersectionHydration } from '../hooks/useIntersectionHydration';

const GitHubStarsContent = forwardRef(function GitHubStarsContent({ user, repo }, ref) {
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
    if (stars === null) {
      fetchStars();
    }
  }, [stars, fetchStars]);

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
});

const GitHubStars = ({ user, repo }) => {
  const ref = useRef(null);
  const shouldHydrate = useIntersectionHydration(ref, { rootMargin: '200px' });

  if (!repo) return null;

  if (!shouldHydrate) {
    return (
      <div
        ref={ref}
        className="inline-flex items-center text-xs text-gray-300"
        data-hydration="deferred"
      >
        <div className="h-5 w-12 bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  return <GitHubStarsContent ref={ref} user={user} repo={repo} />;
};

export default GitHubStars;

