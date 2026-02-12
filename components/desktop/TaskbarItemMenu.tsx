import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import {
  clearTaskbarRecentEntries,
  getTaskbarRecentEntries,
  supportsTaskbarRecents,
  TaskbarRecentEntry,
} from '../../utils/taskbarRecents';

interface TaskbarItemMenuProps {
  /** Whether the menu is visible */
  active: boolean;
  /** ID of the app represented by the taskbar item */
  appId?: string | null;
  /** Whether the taskbar item is currently minimized */
  minimized?: boolean;
  /** Minimize or restore the window */
  onMinimize?: () => void;
  /** Close the window */
  onClose?: () => void;
  /** Close the menu */
  onCloseMenu?: () => void;
  /** Optional handler invoked when a recent entry is selected */
  onOpenRecent?: (entry: TaskbarRecentEntry) => void;
}

const TaskbarItemMenu: React.FC<TaskbarItemMenuProps> = ({
  active,
  appId,
  minimized = false,
  onMinimize,
  onClose,
  onCloseMenu,
  onOpenRecent,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useFocusTrap(menuRef as React.RefObject<HTMLElement>, active);
  useRovingTabIndex(menuRef as React.RefObject<HTMLElement>, active, 'vertical');

  const recentsSupported = useMemo(() => supportsTaskbarRecents(appId), [appId]);
  const [recentEntries, setRecentEntries] = useState<TaskbarRecentEntry[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(false);
  const [recentsError, setRecentsError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      if (!recentsSupported) {
        setRecentEntries([]);
        setRecentsError(null);
        return;
      }
      setLoadingRecents(true);
      setRecentsError(null);
      try {
        const entries = await getTaskbarRecentEntries(appId ?? null);
        if (!cancelled) {
          setRecentEntries(entries);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load recent entries for taskbar menu', err);
          setRecentEntries([]);
          setRecentsError('Unable to load recent files.');
        }
      } finally {
        if (!cancelled) {
          setLoadingRecents(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, appId, recentsSupported]);

  useEffect(() => {
    if (!active) {
      setRecentsError(null);
    }
  }, [active]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onCloseMenu?.();
      }
    },
    [onCloseMenu],
  );

  const handleMinimize = useCallback(() => {
    onMinimize?.();
    onCloseMenu?.();
  }, [onMinimize, onCloseMenu]);

  const handleClose = useCallback(() => {
    onClose?.();
    onCloseMenu?.();
  }, [onClose, onCloseMenu]);

  const handleRecentSelect = useCallback(
    (entry: TaskbarRecentEntry) => {
      if (onOpenRecent) {
        onOpenRecent(entry);
      } else if (typeof window !== 'undefined' && appId) {
        window.dispatchEvent(
          new CustomEvent('taskbar-open-recent', {
            detail: { appId, entry },
          }),
        );
      }
      onCloseMenu?.();
    },
    [onCloseMenu, onOpenRecent, appId],
  );

  const handleClearRecents = useCallback(async () => {
    if (!recentsSupported) return;
    await clearTaskbarRecentEntries(appId ?? null);
    setRecentEntries([]);
    setRecentsError(null);
    if (typeof window !== 'undefined' && appId) {
      window.dispatchEvent(
        new CustomEvent('taskbar-recents-cleared', {
          detail: { appId },
        }),
      );
    }
  }, [appId, recentsSupported]);

  return (
    <div
      id="taskbar-item-menu"
      role="menu"
      aria-hidden={!active}
      ref={menuRef}
      onKeyDown={handleKeyDown}
      className={(active ? ' block ' : ' hidden ') +
        'cursor-default w-60 context-menu-bg border text-left border-gray-900 rounded text-white py-3 absolute z-50 text-sm'}
    >
      <button
        type="button"
        onClick={handleMinimize}
        role="menuitem"
        aria-label={minimized ? 'Restore window' : 'Minimize window'}
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">{minimized ? 'Restore' : 'Minimize'}</span>
      </button>
      <button
        type="button"
        onClick={handleClose}
        role="menuitem"
        aria-label="Close window"
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Close</span>
      </button>

      {recentsSupported && (
        <div className="mt-2 border-t border-gray-800 pt-2" role="presentation">
          <div className="px-5 pb-1 text-xs uppercase tracking-wide text-gray-400" role="presentation">
            Recent Files
          </div>
          {loadingRecents && (
            <div className="px-5 py-1 text-gray-300 text-xs" role="presentation">
              Loading…
            </div>
          )}
          {recentsError && !loadingRecents && (
            <div className="px-5 py-1 text-red-400 text-xs" role="presentation">
              {recentsError}
            </div>
          )}
          {!loadingRecents && !recentsError && recentEntries.length === 0 && (
            <div className="px-5 py-1 text-gray-400 text-xs" role="presentation">
              No recent files
            </div>
          )}
          {!loadingRecents && !recentsError &&
            recentEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                onClick={() => handleRecentSelect(entry)}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
              >
                <span className="ml-5">{entry.label}</span>
                {entry.description && (
                  <span className="ml-5 block text-xs text-gray-400">{entry.description}</span>
                )}
              </button>
            ))}
          {recentEntries.length > 0 && !loadingRecents && (
            <button
              type="button"
              role="menuitem"
              onClick={handleClearRecents}
              className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mt-1"
            >
              <span className="ml-5">Clear List</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskbarItemMenu;
