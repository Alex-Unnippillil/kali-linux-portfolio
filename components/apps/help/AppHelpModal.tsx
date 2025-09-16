import React, { useId, useMemo } from 'react';
import Modal from '../../base/Modal';

export interface ShortcutItem {
  /** Keys to display, in order, for the shortcut. */
  keys: string[];
  /** Primary action or label for the shortcut. */
  title: string;
  /** Optional supporting text that explains the shortcut in more detail. */
  description?: string;
  /** Optional grouping label. Entries with the same group render under one heading. */
  group?: string;
}

export interface AppHelpModalProps {
  title: string;
  description?: string;
  shortcuts: ShortcutItem[];
  onClose: () => void;
  footnote?: React.ReactNode;
}

const groupKey = (value?: string) => (value && value.trim() ? value.trim() : '');

const AppHelpModal: React.FC<AppHelpModalProps> = ({
  title,
  description,
  shortcuts,
  onClose,
  footnote,
}) => {
  const titleId = useId();
  const descriptionId = description ? useId() : undefined;

  const groups = useMemo(() => {
    const map = new Map<string, ShortcutItem[]>();
    shortcuts.forEach((item) => {
      const key = groupKey(item.group);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [shortcuts]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-lg border border-white/10 bg-ub-cool-grey text-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/20 p-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-gray-200">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring"
            aria-label="Close help dialog"
          >
            ×
          </button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {groups.length === 0 ? (
            <p className="text-sm text-gray-200">
              No shortcuts are registered for this app yet.
            </p>
          ) : (
            groups.map(([group, entries]) => (
              <section key={group || 'default'} className="mt-4 first:mt-0">
                {group && (
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ubt-green">
                    {group}
                  </h3>
                )}
                <ul className="space-y-3">
                  {entries.map((shortcut, index) => (
                    <li key={`${shortcut.title}-${index}`} className="rounded-lg border border-white/5 bg-black/20 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {shortcut.keys.map((key, keyIndex) => (
                            <kbd
                              key={`${key}-${keyIndex}`}
                              className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                        <span className="text-sm font-medium">{shortcut.title}</span>
                      </div>
                      {shortcut.description && (
                        <p className="mt-2 text-xs text-gray-200">
                          {shortcut.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <footer className="flex items-center justify-between gap-4 border-t border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-200">
          {footnote && <div className="text-left">{footnote}</div>}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-ub-orange px-3 py-1 font-medium text-black shadow hover:bg-ub-orange/90 focus:outline-none focus-visible:ring"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
};

export default AppHelpModal;
