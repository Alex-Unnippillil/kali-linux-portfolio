'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Modal from '../base/Modal';
import { safeLocalStorage } from '../../utils/safeStorage';
import changelogSource from '../../CHANGELOG.md';

const STORAGE_KEY = 'changelog:lastDismissedVersion';

type TriggerRenderProps = {
  open: () => void;
  close: () => void;
  hasNew: boolean;
  latestVersion: string | null;
  isOpen: boolean;
};

interface ChangelogModalProps {
  trigger?: (props: TriggerRenderProps) => React.ReactNode;
}

interface ChangelogSection {
  id: string;
  label: string;
}

interface ParsedChangelog {
  html: string;
  sections: ChangelogSection[];
  latestVersion: string | null;
}

const VERSION_HEADING_REGEX = /^## \[(\d+\.\d+\.\d+[^\]]*)\]/m;

export const LATEST_CHANGELOG_VERSION = (() => {
  const match = changelogSource.match(VERSION_HEADING_REGEX);
  return match ? match[1] : null;
})();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return encodeURI(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderInline(text: string): string {
  const parts: string[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    const [full, label, url] = match;
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }
    parts.push(
      `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
    );
    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts.join('');
}

function slugify(text: string, seen: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  const normalized = base || 'section';
  const key = /^[a-z]/.test(normalized) ? normalized : `section-${normalized}`;
  const count = seen.get(key) ?? 0;
  seen.set(key, count + 1);
  return count === 0 ? key : `${key}-${count}`;
}

function parseChangelog(markdown: string): ParsedChangelog {
  const lines = markdown.split(/\r?\n/);
  const htmlParts: string[] = [];
  const sections: ChangelogSection[] = [];
  let latestVersion: string | null = null;
  const seenSlugs = new Map<string, number>();

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const paragraph = paragraphBuffer.join(' ').trim();
    if (paragraph) {
      htmlParts.push(`<p>${renderInline(paragraph)}</p>`);
    }
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((item) => `<li>${renderInline(item)}</li>`).join('');
    htmlParts.push(`<ul>${items}</ul>`);
    listBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      const headingText = line.slice(3).trim();
      const slug = slugify(headingText, seenSlugs);
      htmlParts.push(`<h2 id="${slug}">${renderInline(headingText)}</h2>`);
      const labelMatch = headingText.match(/^\[([^\]]+)\]/);
      const label = labelMatch ? labelMatch[1] : headingText;
      if (!latestVersion) {
        const versionMatch = headingText.match(/^(?:\[)?(\d+\.\d+\.\d+[^\]]*)/);
        if (versionMatch) {
          latestVersion = versionMatch[1];
        }
      }
      sections.push({ id: slug, label });
      return;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      const headingText = line.slice(4).trim();
      const slug = slugify(headingText, seenSlugs);
      htmlParts.push(`<h3 id="${slug}">${renderInline(headingText)}</h3>`);
      return;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      listBuffer.push(line.slice(2).trim());
      return;
    }

    paragraphBuffer.push(line.trim());
  });

  flushParagraph();
  flushList();

  return {
    html: htmlParts.join(''),
    sections,
    latestVersion,
  };
}

const FOCUSABLE_CLASS =
  'rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300';

const INDICATOR_CLASSES =
  'absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5';

const INDICATOR_INNER_CLASSES =
  'relative inline-flex h-2.5 w-2.5 rounded-full bg-ubb-orange';

const INDICATOR_PING_CLASSES =
  'absolute inline-flex h-full w-full animate-ping rounded-full bg-ubb-orange/60 opacity-75';

const NAV_BUTTON_BASE_CLASSES =
  'w-full rounded-md px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300';

const NAV_BUTTON_ACTIVE_CLASSES = 'bg-white/20 text-white';

const NAV_BUTTON_INACTIVE_CLASSES = 'text-white/70 hover:bg-white/10';

function getScrollTarget(
  container: HTMLElement | null,
  id: string
): HTMLElement | null {
  if (!container) return null;
  return container.querySelector(`#${id}`);
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ trigger }) => {
  const { html, sections, latestVersion } = useMemo(
    () => parseChangelog(changelogSource),
    []
  );
  const [isOpen, setIsOpen] = useState(false);
  const [lastDismissedVersion, setLastDismissedVersion] = useState<string | null>(
    null
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const navRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeSection, setActiveSection] = useState<string | null>(
    sections[0]?.id ?? null
  );

  const hasNew = Boolean(
    latestVersion && lastDismissedVersion !== latestVersion
  );

  useEffect(() => {
    if (!latestVersion) return;
    const stored = safeLocalStorage?.getItem(STORAGE_KEY) ?? null;
    setLastDismissedVersion(stored);
    if (!stored || stored !== latestVersion) {
      setIsOpen(true);
    }
  }, [latestVersion]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveSection(sections[0]?.id ?? null);
  }, [isOpen, sections]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const container = contentRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop
          );
        const next = visible[0]?.target?.id;
        if (next) {
          setActiveSection(next);
        }
      },
      {
        root: container,
        threshold: 0.4,
      }
    );

    sections.forEach((section) => {
      const target = getScrollTarget(container, section.id);
      if (target) {
        observer.observe(target);
      }
    });

    return () => observer.disconnect();
  }, [isOpen, sections]);

  const persistDismissal = useCallback(() => {
    if (!latestVersion) return;
    safeLocalStorage?.setItem(STORAGE_KEY, latestVersion);
    setLastDismissedVersion(latestVersion);
  }, [latestVersion]);

  const handleClose = useCallback(() => {
    persistDismissal();
    setIsOpen(false);
  }, [persistDismissal]);

  const handleDontShow = useCallback(() => {
    persistDismissal();
    setIsOpen(false);
  }, [persistDismissal]);

  const handleNavSelect = useCallback(
    (id: string) => {
      setActiveSection(id);
      const container = contentRef.current;
      const target = getScrollTarget(container, id);
      if (target) {
        if (typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (container) {
          container.scrollTop = target.offsetTop;
        }
      }
    },
    []
  );

  const handleNavKeyDown = useCallback(
    (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        navRefs.current[index + 1]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        navRefs.current[index - 1]?.focus();
      }
    },
    []
  );

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const triggerNode = trigger ? (
    trigger({
      open: openModal,
      close: handleClose,
      hasNew,
      latestVersion,
      isOpen,
    })
  ) : (
    <button
      type="button"
      onClick={openModal}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={
        hasNew
          ? "View what's new (new release available)"
          : "View what's new"
      }
      data-has-new={hasNew ? 'true' : 'false'}
      className="relative rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/90 shadow-sm transition duration-150 ease-in-out hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      <span>What&apos;s new</span>
      {hasNew && (
        <span className={INDICATOR_CLASSES}>
          <span className={INDICATOR_PING_CLASSES} />
          <span className={INDICATOR_INNER_CLASSES} />
        </span>
      )}
    </button>
  );

  return (
    <>
      {triggerNode}
      <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-slate-950/80"
            aria-hidden="true"
            onClick={handleClose}
          />
          <div className="relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-white/10">
            <header className="flex flex-col gap-3 border-b border-white/10 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 id="changelog-modal-title" className="text-lg font-semibold">
                  What&apos;s new
                </h2>
                {latestVersion && (
                  <p className="text-sm text-slate-400">
                    Latest version: {latestVersion}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className={FOCUSABLE_CLASS}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDontShow}
                  className={FOCUSABLE_CLASS}
                >
                  Don&apos;t show for this version
                </button>
              </div>
            </header>
            <div className="flex min-h-[60vh] flex-1 flex-col md:flex-row">
              <aside className="border-b border-white/10 px-4 py-4 md:w-56 md:border-b-0 md:border-r md:px-6">
                <nav aria-label="Changelog versions">
                  <ul className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-0">
                    {sections.map((section, index) => (
                      <li key={section.id} className="md:mb-1 md:last:mb-0">
                        <button
                          type="button"
                          ref={(el) => {
                            navRefs.current[index] = el;
                          }}
                          onKeyDown={handleNavKeyDown(index)}
                          onClick={() => handleNavSelect(section.id)}
                          aria-current={
                            activeSection === section.id ? 'true' : undefined
                          }
                          className={`${NAV_BUTTON_BASE_CLASSES} ${
                            activeSection === section.id
                              ? NAV_BUTTON_ACTIVE_CLASSES
                              : NAV_BUTTON_INACTIVE_CLASSES
                          }`}
                        >
                          {section.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto px-6 py-6 text-sm leading-6"
              >
                <div className="prose prose-invert max-w-none" data-testid="changelog-markdown">
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ChangelogModal;

export { STORAGE_KEY as CHANGELOG_STORAGE_KEY };

