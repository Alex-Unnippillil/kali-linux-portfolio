import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import usePersistentState from '../hooks/usePersistentState';

const GitHubStars = ({ user, repo }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [stars, setStars] = usePersistentState(`gh-stars-${user}/${repo}`, null);
  const [loading, setLoading] = useState(stars === null);
  const isTestEnv = process.env.NODE_ENV === 'test';

  const formattedStars = useMemo(() => {
    if (typeof stars !== 'number') return '';
    return new Intl.NumberFormat('en-US').format(stars);
  }, [stars]);

  const avatarSrc = useMemo(() => {
    if (!user) return null;
    return `https://github.com/${user}.png?size=64`;
  }, [user]);

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
    <div
      ref={ref}
      className="flex h-16 max-h-16 min-h-[56px] w-full max-w-xs items-center rounded-lg bg-black/40 px-3 py-2 text-xs text-gray-300 backdrop-blur"
    >
      {loading ? (
        <div className="flex w-full items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-700/50" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-700/40" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-700/30" />
          </div>
          <div className="h-6 w-6 animate-pulse rounded bg-gray-700/40" />
        </div>
      ) : (
        <div className="flex w-full items-center gap-3">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={`${user}'s GitHub avatar`}
              className="h-10 w-10 flex-shrink-0 rounded-full border border-white/10 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-gray-800 text-sm">
              GH
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-left">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              GitHub Stars
            </span>
            <div className="flex items-center gap-1 text-sm font-semibold text-white">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current text-yellow-400"
              >
                <path d="M12 .75l2.917 7.468 7.908.285-6.097 4.998 1.979 7.743L12 16.95l-6.707 4.294 1.979-7.743-6.097-4.998 7.908-.285z" />
              </svg>
              <span className="truncate">{formattedStars}</span>
            </div>
            <span className="truncate text-[11px] text-gray-400">{repo}</span>
          </div>
          <button
            onClick={fetchStars}
            aria-label="Refresh star count"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4 fill-current"
            >
              <path d="M15.312 4.687A7 7 0 002.99 9.2a.75.75 0 101.48.274 5.5 5.5 0 119.024 4.93l-.002-.002-.855-.855a.75.75 0 00-1.06 1.061l2.263 2.262a.75.75 0 001.061 0l2.262-2.262a.75.75 0 10-1.06-1.06l-.893.892a7 7 0 00-.959-9.054z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default GitHubStars;
