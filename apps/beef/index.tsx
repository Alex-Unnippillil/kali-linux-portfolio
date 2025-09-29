'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import BeefApp from '../../components/apps/beef';
import TagBar from './components/TagBar';
import { PRELOADED_VICTIMS } from './data/victims';
import { filterVictimsByTags } from './utils/filterVictims';

type Severity = 'Low' | 'Medium' | 'High';

type TagState = Record<string, string[]>;

interface LogEntry {
  time: string;
  severity: Severity;
  message: string;
}

const STORAGE_KEY = 'beef-victim-tags';

const severityStyles: Record<Severity, { icon: string; color: string }> = {
  Low: { icon: '🟢', color: 'bg-green-700' },
  Medium: { icon: '🟡', color: 'bg-yellow-700' },
  High: { icon: '🔴', color: 'bg-red-700' },
};

const normalizeTag = (tag: string) => tag.trim().toLowerCase();

const mergeUniqueTags = (base: string[], extra: string[] = []) => {
  const seen = new Set<string>();
  base.forEach((tag) => {
    const normalized = normalizeTag(tag);
    if (normalized) {
      seen.add(normalized);
    }
  });
  extra.forEach((tag) => {
    const normalized = normalizeTag(tag);
    if (normalized) {
      seen.add(normalized);
    }
  });
  return Array.from(seen);
};

const buildBaseTagState = (): TagState =>
  PRELOADED_VICTIMS.reduce<TagState>((acc, victim) => {
    acc[victim.id] = mergeUniqueTags(victim.tags);
    return acc;
  }, {});

const cloneTagState = (state: TagState): TagState =>
  Object.fromEntries(Object.entries(state).map(([key, tags]) => [key, [...tags]]));

const BeefPage: React.FC = () => {
  const [logs] = useState<LogEntry[]>([
    { time: '10:00:00', severity: 'Low', message: 'Hook initialized' },
    { time: '10:00:02', severity: 'Medium', message: 'Payload delivered' },
    { time: '10:00:03', severity: 'High', message: 'Sensitive data exfil attempt' },
  ]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const baseTagState = useMemo(() => buildBaseTagState(), []);
  const [tagState, setTagState] = useState<TagState>(() => cloneTagState(baseTagState));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      const stored = parsed as Record<string, string[]>;
      setTagState(() => {
        const next = cloneTagState(baseTagState);
        Object.entries(stored).forEach(([victimId, tags]) => {
          if (!Array.isArray(tags)) {
            return;
          }
          next[victimId] = mergeUniqueTags(next[victimId] ?? [], tags);
        });
        return next;
      });
    } catch {
      // ignore storage errors
    } finally {
      setStorageLoaded(true);
    }
  }, [baseTagState]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tagState));
    } catch {
      // ignore write failures
    }
  }, [tagState, storageLoaded]);

  const victimsWithTags = useMemo(
    () =>
      PRELOADED_VICTIMS.map((victim) => ({
        ...victim,
        tags: tagState[victim.id] ?? [],
      })),
    [tagState],
  );

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(tagState).forEach((tags) => {
      tags.forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [tagState]);

  useEffect(() => {
    setActiveFilters((prev) => {
      const filtered = prev.filter((tag) => availableTags.includes(tag));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [availableTags]);

  const filteredVictims = useMemo(
    () => filterVictimsByTags(victimsWithTags, activeFilters),
    [victimsWithTags, activeFilters],
  );

  const handleAddTag = (victimId: string, tag: string) => {
    setTagState((prev) => {
      const current = prev[victimId] ?? [];
      if (current.includes(tag)) {
        return prev;
      }
      return {
        ...prev,
        [victimId]: [...current, tag],
      };
    });
  };

  const handleRemoveTag = (victimId: string, tag: string) => {
    setTagState((prev) => {
      const current = prev[victimId] ?? [];
      if (!current.includes(tag)) {
        return prev;
      }
      const nextTags = current.filter((value) => value !== tag);
      return {
        ...prev,
        [victimId]: nextTags,
      };
    });
  };

  const toggleFilterTag = (tag: string) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag],
    );
  };

  const clearFilters = () => setActiveFilters([]);

  const totalVictims = PRELOADED_VICTIMS.length;

  return (
    <div className="bg-ub-cool-grey text-white h-full w-full flex flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/themes/Yaru/apps/beef.svg"
            alt="BeEF badge"
            width={48}
            height={48}
          />
          <h1 className="text-xl">BeEF Demo</h1>
        </div>
        <div className="flex gap-2">
          <img
            src="/themes/Yaru/window/window-minimize-symbolic.svg"
            alt="minimize"
            className="w-6 h-6"
          />
          <img
            src="/themes/Yaru/window/window-close-symbolic.svg"
            alt="close"
            className="w-6 h-6"
          />
        </div>
      </header>

      <div className="p-4 flex-1 overflow-auto space-y-6">
        <section className="rounded-lg border border-gray-700 bg-black/40 p-4 shadow-inner">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl space-y-1">
              <h2 className="text-lg font-semibold">Victim Directory</h2>
              <p className="text-xs text-gray-300">
                Tags are stored locally in your browser so you can experiment without real network traffic.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-80">
              <TagBar
                label="Filter by tag"
                tags={availableTags}
                selectedTags={activeFilters}
                onToggleTag={toggleFilterTag}
                className="md:items-end"
              />
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>
                  Showing {filteredVictims.length} of {totalVictims}
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={activeFilters.length === 0}
                  className={`rounded px-2 py-1 font-semibold transition-colors ${
                    activeFilters.length === 0
                      ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                      : 'bg-ub-primary text-white hover:bg-ub-primary/80'
                  }`}
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredVictims.map((victim) => (
              <article
                key={victim.id}
                className="rounded-lg border border-gray-700 bg-gray-900/60 p-4 shadow transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">{victim.name}</h3>
                    <p className="text-xs text-gray-400">
                      {victim.ip} · {victim.browser}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      victim.status === 'online'
                        ? 'bg-green-700/80 text-green-100'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {victim.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-300">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-gray-400">OS</dt>
                    <dd className="text-sm text-white">{victim.os}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-gray-400">Last seen</dt>
                    <dd className="text-sm text-white">{victim.lastSeen}</dd>
                  </div>
                </dl>
                <TagBar
                  className="mt-3"
                  label="Tags"
                  tags={victim.tags}
                  selectedTags={activeFilters}
                  onAddTag={(tag) => handleAddTag(victim.id, tag)}
                  onRemoveTag={(tag) => handleRemoveTag(victim.id, tag)}
                  onToggleTag={toggleFilterTag}
                />
              </article>
            ))}
          </div>

          {filteredVictims.length === 0 && (
            <p className="mt-6 text-sm text-gray-300">
              No victims match the selected tags. Try clearing the filters or adding a new tag to any victim.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-gray-700 bg-black/40 p-4">
          <BeefApp />
        </section>
      </div>

      <div className="border-t border-gray-700 font-mono text-sm">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-center gap-2 px-2 py-1.5">
            <span
              className={`flex items-center px-2 py-0.5 rounded-full text-xs ${severityStyles[log.severity].color}`}
            >
              <span className="mr-1">{severityStyles[log.severity].icon}</span>
              {log.severity}
            </span>
            <span className="text-gray-400">{log.time}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BeefPage;
