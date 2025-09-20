"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  SessionMetadata,
  getSnapshot,
  isUserSwitcherEnabled,
  setLockState,
  subscribe,
  switchToUser,
} from '../../../modules/system/sessionManager';

interface UserSwitcherProps {
  onClose: () => void;
}

const formatRelativeTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp)) return 'Unknown';
  const delta = Date.now() - Number(timestamp);
  if (!Number.isFinite(delta) || delta <= 0) return 'Just now';
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
};

const emptySnapshot = () => {
  const snapshot = getSnapshot();
  return {
    sessions: snapshot.sessions,
    activeId: snapshot.active?.meta.id ?? null,
  };
};

const UserSwitcher = ({ onClose }: UserSwitcherProps) => {
  const enabled = isUserSwitcherEnabled();
  const initial = useMemo(() => emptySnapshot(), []);
  const [sessions, setSessions] = useState<SessionMetadata[]>(initial.sessions);
  const [activeId, setActiveId] = useState<string | null>(initial.activeId);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return () => undefined;
    const unsubscribe = subscribe((snapshot) => {
      setSessions(snapshot.sessions);
      setActiveId(snapshot.active?.meta.id ?? null);
    });
    return unsubscribe;
  }, [enabled]);

  useEffect(() => {
    const node = dialogRef.current;
    previousFocus.current = document.activeElement as HTMLElement | null;
    if (node) {
      node.focus();
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus();
    };
  }, [onClose]);

  const handleSwitch = (id: string) => {
    if (pendingId) return;
    setError(null);
    setPendingId(id);
    startTransition(() => {
      switchToUser(id)
        .then(() => {
          setPendingId(null);
          onClose();
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Unable to switch session';
          setError(message);
          setPendingId(null);
        });
    });
  };

  const handleLockToggle = (id: string, locked: boolean) => {
    setError(null);
    setLockState(id, locked);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black bg-opacity-70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-switcher-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-3xl rounded-lg bg-ub-cool-grey p-6 text-white shadow-xl outline-none"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="user-switcher-title" className="text-xl font-semibold">
            User sessions
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-transparent bg-black bg-opacity-20 px-3 py-1 text-sm hover:bg-opacity-30 focus:border-ubt-grey focus:outline-none"
          >
            Close
          </button>
        </div>

        {!enabled ? (
          <p className="mt-6 text-sm text-ubt-grey">
            Multi-user switching has been disabled by your administrator. You
            can re-enable it by setting
            <code className="mx-2 rounded bg-black bg-opacity-30 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_ENABLE_USER_SWITCHER
            </code>
            to <code className="text-xs">enabled</code> in the environment
            configuration.
          </p>
        ) : (
          <>
            {error && (
              <div className="mt-4 rounded border border-red-400 bg-red-500 bg-opacity-20 px-3 py-2 text-sm">
                {error}
              </div>
            )}
            <ul className="mt-4 flex flex-col gap-3">
              {sessions.length === 0 && (
                <li className="rounded border border-dashed border-ubt-grey px-4 py-6 text-sm text-ubt-grey">
                  No saved sessions yet. Start using the desktop to capture a
                  workspace snapshot for each role.
                </li>
              )}
              {sessions.map((session) => {
                const isActive = session.id === activeId;
                const disabled = isActive || session.locked;
                return (
                  <li
                    key={session.id}
                    className={`flex flex-col gap-4 rounded-lg border px-4 py-3 transition-colors md:flex-row md:items-center md:justify-between ${
                      isActive
                        ? 'border-ub-orange bg-black bg-opacity-20'
                        : 'border-transparent bg-black bg-opacity-10'
                    }`}
                  >
                    <div>
                      <p className="text-lg font-medium">
                        {session.displayName}
                        {isActive && (
                          <span className="ml-2 rounded bg-ub-orange px-2 py-0.5 text-xs uppercase tracking-wide text-black">
                            Active
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-ubt-grey">
                        {session.locked ? 'Locked session' : 'Unlocked session'}
                        {' • '}Last activity {formatRelativeTime(session.lastActive)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLockToggle(session.id, !session.locked)}
                        className="rounded border border-transparent bg-black bg-opacity-30 px-3 py-1 text-sm hover:bg-opacity-40 focus:border-ubt-grey focus:outline-none"
                      >
                        {session.locked ? 'Unlock' : 'Lock'}
                      </button>
                      <button
                        type="button"
                        disabled={disabled || pendingId === session.id || isPending}
                        onClick={() => handleSwitch(session.id)}
                        className={`rounded px-3 py-1 text-sm font-medium focus:outline-none ${
                          disabled || pendingId === session.id || isPending
                            ? 'cursor-not-allowed bg-black bg-opacity-20 text-ubt-grey'
                            : 'bg-ub-orange text-black hover:bg-ub-orange/90'
                        }`}
                      >
                        {pendingId === session.id || isPending
                          ? 'Switching…'
                          : isActive
                          ? 'Current'
                          : session.locked
                          ? 'Locked'
                          : 'Switch'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-ubt-grey">
              Switching keeps every workspace alive so analysts can pause a
              task, pivot to another role, and return without a full logout.
              Session state is cached locally and restored in under three
              seconds on the reference hardware target.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default UserSwitcher;

