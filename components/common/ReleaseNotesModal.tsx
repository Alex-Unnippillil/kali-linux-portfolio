'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import Modal from '../base/Modal';
import { safeLocalStorage } from '../../utils/safeStorage';

type ReleaseSection = {
  title: string;
  items?: string[];
  description?: string;
};

type ReleaseEntry = {
  version: string;
  date?: string | null;
  url?: string;
  sections?: ReleaseSection[];
};

type ReleaseNotesPayload = {
  generatedAt: string;
  source?: {
    changelog?: string;
  };
  latest?: ReleaseEntry;
  entries: ReleaseEntry[];
};

const RELEASE_NOTES_PATH = '/release-notes.json';
const DEFAULT_PROFILE_ID = 'default';
const PROFILE_STORAGE_KEYS = ['desktop:active-profile', 'active-profile', 'profile:id'];

const getActiveProfileId = (): string => {
  if (typeof window === 'undefined') return DEFAULT_PROFILE_ID;
  for (const key of PROFILE_STORAGE_KEYS) {
    try {
      const value = window.localStorage.getItem(key);
      if (value) {
        return value;
      }
    } catch {
      // ignore storage errors
    }
  }
  return DEFAULT_PROFILE_ID;
};

const scopedKey = (profileId: string, suffix: string) => `release-notes:${profileId}:${suffix}`;

const readStorage = (key: string): string | null => {
  try {
    return safeLocalStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    safeLocalStorage?.setItem(key, value);
  } catch {
    // ignore storage errors
  }
};

const sanitizeMarkdown = (markdown: string) =>
  DOMPurify.sanitize(marked.parseInline(markdown) as string);

const formatDate = (raw?: string | null): string | null => {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(parsed);
  } catch {
    return raw;
  }
};

const ReleaseNotesModal: React.FC = () => {
  const [data, setData] = useState<ReleaseNotesPayload | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null);

  const loadProfileState = useCallback((id: string) => {
    const muteKey = scopedKey(id, 'muted');
    const seenKey = scopedKey(id, 'last-seen');
    setMuted(readStorage(muteKey) === 'true');
    setLastSeenVersion(readStorage(seenKey));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activeId = getActiveProfileId();
    setProfileId(activeId);
    loadProfileState(activeId);
  }, [loadProfileState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const fetchNotes = async () => {
      try {
        const response = await fetch(RELEASE_NOTES_PATH, { cache: 'no-store' });
        if (!response.ok) {
          console.warn(`[release-notes] Failed to load release notes (status ${response.status})`);
          return;
        }
        const payload = (await response.json()) as ReleaseNotesPayload;
        if (!cancelled) {
          setData(payload);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[release-notes] Failed to fetch release notes', error);
        }
      }
    };
    fetchNotes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (PROFILE_STORAGE_KEYS.includes(event.key)) {
        const activeId = getActiveProfileId();
        setProfileId(activeId);
        loadProfileState(activeId);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadProfileState]);

  useEffect(() => {
    if (!data?.latest || profileId === null) return;
    if (!muted && lastSeenVersion !== data.latest.version) {
      setIsOpen(true);
    }
  }, [data, profileId, muted, lastSeenVersion]);

  const handleClose = useCallback(() => {
    if (profileId && data?.latest?.version) {
      const seenKey = scopedKey(profileId, 'last-seen');
      writeStorage(seenKey, data.latest.version);
      setLastSeenVersion(data.latest.version);
    }
    setIsOpen(false);
  }, [profileId, data]);

  const handleMutedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.checked;
      setMuted(nextValue);
      if (profileId) {
        const key = scopedKey(profileId, 'muted');
        writeStorage(key, nextValue ? 'true' : 'false');
      }
    },
    [profileId],
  );

  const latest = data?.latest;
  const formattedDate = useMemo(() => formatDate(latest?.date ?? null), [latest?.date]);
  const changelogUrl = latest?.url ?? data?.source?.changelog ?? null;

  if (!latest) {
    return null;
  }

  const modalTitleId = 'release-notes-title';
  const modalDescriptionId = 'release-notes-description';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      ariaLabelledBy={modalTitleId}
      ariaDescribedBy={modalDescriptionId}
    >
      <div className="fixed inset-0 z-[1000] bg-black/60" aria-hidden="true" onClick={handleClose} />
      <div className="relative z-[1001] w-full max-w-xl rounded-lg bg-ub-grey text-white shadow-xl">
        <header className="flex items-start justify-between border-b border-white/10 p-4">
          <div>
            <h2 id={modalTitleId} className="text-xl font-semibold">
              {`What's new in v${latest.version}`}
            </h2>
            {formattedDate && (
              <p className="mt-1 text-sm text-ubt-grey">Released on {formattedDate}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded bg-white/10 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange focus-visible:ring-offset-2 focus-visible:ring-offset-ub-grey"
          >
            Close
          </button>
        </header>
        <div id={modalDescriptionId} className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
          {(latest.sections ?? []).length === 0 ? (
            <p>No release notes available for this version.</p>
          ) : (
            (latest.sections ?? []).map((section) => (
              <section key={section.title} className="space-y-2">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                {section.description && (
                  <p
                    className="text-sm text-ubt-grey"
                    dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(section.description) }}
                  />
                )}
                {section.items && section.items.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {section.items.map((item, index) => (
                      <li
                        key={`${section.title}-${index}`}
                        dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(item) }}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}
        </div>
        <footer className="flex flex-col gap-4 border-t border-white/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={muted} onChange={handleMutedChange} />
            <span>Don&apos;t show again for this profile</span>
          </label>
          {changelogUrl && (
            <a
              href={changelogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ubt-blue underline transition-colors hover:text-ubb-orange"
            >
              View full changelog
            </a>
          )}
        </footer>
      </div>
    </Modal>
  );
};

export default ReleaseNotesModal;
