import React, { useEffect, useRef, useState, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';

const BASE_BACKOFF = 1000;
const MAX_BACKOFF = 60_000;

const GitHubStars = ({ user, repo }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [stars, setStars] = usePersistentState(`gh-stars-${user}/${repo}`, null);
  const [loading, setLoading] = useState(stars === null);
  const [rateLimited, setRateLimited] = useState(false);
  const retryTimer = useRef(null);
  const retryAttempt = useRef(0);
  const inFlight = useRef(false);

  const scheduleRetry = useCallback(
    (retryFn) => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
      }
      const attempt = retryAttempt.current;
      const delay = Math.min(MAX_BACKOFF, BASE_BACKOFF * 2 ** attempt);
      retryAttempt.current = attempt + 1;
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        retryFn();
      }, delay);
    },
    [],
  );

  const fetchStars = useCallback(async () => {
    if (!repo || inFlight.current) {
      return;
    }
    inFlight.current = true;
    try {
      setLoading(true);
      const res = await fetch(`https://api.github.com/repos/${user}/${repo}`);
      if (res.status === 403) {
        setRateLimited(true);
        scheduleRetry(fetchStars);
        return;
      }
      if (!res.ok) {
        throw new Error('Request failed');
      }
      const data = await res.json();
      setStars(data.stargazers_count || 0);
      setRateLimited(false);
      retryAttempt.current = 0;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    } catch (e) {
      console.error('Failed to fetch star count', e);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [user, repo, setStars, scheduleRetry]);

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

  useEffect(() => () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
    }
  }, []);

  if (!repo) return null;

  const starValue = typeof stars === 'number' ? stars : '--';

  return (
    <div
      ref={ref}
      className="inline-flex flex-col text-xs text-gray-300 space-y-1"
    >
      {rateLimited && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-2 rounded border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-amber-200"
        >
          <span aria-hidden="true">⚠️</span>
          <span>Rate limited by GitHub API. Retrying soon…</span>
        </div>
      )}
      <div className="inline-flex items-center">
        {loading ? (
          <div className="h-5 w-12 animate-pulse rounded bg-gray-200" />
        ) : (
          <>
            <span>⭐ {starValue}</span>
            <button
              type="button"
              onClick={fetchStars}
              aria-label="Refresh star count"
              className="ml-2 text-gray-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || rateLimited}
              title={rateLimited ? 'GitHub API rate limited' : 'Refresh star count'}
            >
              ↻
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GitHubStars;

