import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../hooks/usePersistentState';

const getLocale = () => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch (e) {
    return 'en-US';
  }
};

const normalizeStoredData = (data, { user, repo }) => {
  if (!data) return null;
  if (typeof data === 'number') {
    return {
      stars: data,
      avatarUrl: null,
      htmlUrl: `https://github.com/${user}/${repo}`,
    };
  }

  return {
    stars: typeof data.stars === 'number' ? data.stars : 0,
    avatarUrl: data.avatarUrl || null,
    htmlUrl: data.htmlUrl || `https://github.com/${user}/${repo}`,
  };
};

const GitHubStars = ({ user, repo }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [storedRepoData, setStoredRepoData] = usePersistentState(
    `gh-stars-${user}/${repo}`,
    null,
  );
  const [loading, setLoading] = useState(!storedRepoData);

  const repoData = useMemo(
    () => normalizeStoredData(storedRepoData, { user, repo }),
    [storedRepoData, repo, user],
  );

  const formatStarCount = useCallback((value) => {
    if (value === null || value === undefined) return '0';
    const locale = getLocale();
    const maximumFractionDigits = value >= 1000 ? 1 : 0;
    try {
      const formatter = new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits,
      });
      const formatted = formatter.format(value);
      const trimmed = formatted.replace(/\.0(?=[^\d]|$)/, '');
      return trimmed.replace(/([A-Z\u00C0-\u024F]+)/g, (match) => match.toLowerCase());
    } catch (error) {
      console.error('Failed to format star count', error);
      return value.toString();
    }
  }, []);

  const fetchStars = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://api.github.com/repos/${user}/${repo}`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setStoredRepoData({
        stars: data.stargazers_count || 0,
        avatarUrl: data.owner?.avatar_url || null,
        htmlUrl: data.html_url || `https://github.com/${user}/${repo}`,
      });
    } catch (e) {
      console.error('Failed to fetch star count', e);
    } finally {
      setLoading(false);
    }
  }, [repo, setStoredRepoData, user]);

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
    if (!repoData || !repoData.avatarUrl) {
      fetchStars();
    }
  }, [visible, repoData, fetchStars]);

  if (!repo) return null;

  return (
    <div
      ref={ref}
      className="inline-flex h-14 items-center gap-2 rounded-md bg-gray-900/70 px-2 text-xs text-gray-200 shadow-sm"
    >
      {!repoData && loading ? (
        <div className="flex h-full items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-700" />
          <div className="flex flex-col justify-center gap-2">
            <div className="h-3 w-16 rounded bg-gray-700" />
            <div className="h-3 w-10 rounded bg-gray-700" />
          </div>
        </div>
      ) : (
        <>
          <img
            src={repoData?.avatarUrl || `https://github.com/${user}.png`}
            alt={`${user}'s avatar`}
            className="h-9 w-9 rounded-full border border-white/10 object-cover"
          />
          <div className="flex flex-col justify-center gap-1">
            <span className="flex items-center gap-1 text-sm font-semibold text-white">
              <span aria-hidden className="text-base leading-none">
                ⭐
              </span>
              {formatStarCount(repoData?.stars ?? 0)}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <a
                href={repoData?.htmlUrl || `https://github.com/${user}/${repo}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                View repo
              </a>
              <button
                onClick={fetchStars}
                aria-label="Refresh star count"
                className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-gray-400 hover:bg-gray-800/80 hover:text-white"
                type="button"
              >
                ↻
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GitHubStars;

