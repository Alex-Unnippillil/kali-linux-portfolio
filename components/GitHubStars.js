import React, { useEffect, useRef, useState, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import Button from '@/components/ui/Button';

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
    <div ref={ref} className="inline-flex items-center text-xs text-gray-300">
      {loading ? (
        <div className="h-5 w-12 bg-gray-200 animate-pulse rounded" />
      ) : (
        <>
          <span>⭐ {stars}</span>
          <Button
            onClick={fetchStars}
            aria-label="Refresh star count"
            variant="secondary"
            className="ml-2"
          >
            ↻
          </Button>
        </>
      )}
    </div>
  );
};

export default GitHubStars;

