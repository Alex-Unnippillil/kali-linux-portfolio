import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import DelayedTooltip from '../../components/ui/DelayedTooltip';
import AppTooltipContent from '../../components/ui/AppTooltipContent';
import {
  buildAppMetadata,
  loadAppRegistry,
} from '../../lib/appRegistry';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [metadata, setMetadata] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const sectionRefs = useRef({});

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { apps: registry, metadata: registryMeta } = await loadAppRegistry();
      if (!isMounted) return;
      setApps(registry);
      setMetadata(registryMeta);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    return apps
      .filter(
        (app) =>
          !app.disabled &&
          app.title.toLowerCase().includes(normalizedQuery),
      )
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }, [apps, query]);

  const groupedApps = useMemo(() => {
    const groups = new Map();
    filteredApps.forEach((app) => {
      const firstChar = app.title.trim().charAt(0).toUpperCase();
      const groupKey = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(app);
    });
    const sortedEntries = Array.from(groups.entries()).sort(([letterA], [letterB]) => {
      if (letterA === '#') return 1;
      if (letterB === '#') return -1;
      return letterA.localeCompare(letterB);
    });

    return sortedEntries.map(([letter, entries]) => ({
      letter,
      label: letter === '#' ? '0-9 & symbols' : letter,
      apps: entries,
    }));
  }, [filteredApps]);

  useEffect(() => {
    sectionRefs.current = {};
  }, [groupedApps]);

  useEffect(() => {
    const handler = (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      const code = event.code || '';
      const isLetterCode = code.startsWith('Key');
      if (!isLetterCode) return;

      const targetLetter = code.replace('Key', '').toUpperCase();
      const targets = sectionRefs.current[targetLetter];
      if (!targets || targets.length === 0) return;

      event.preventDefault();

      const activeElement = document.activeElement;
      const currentIndex = targets.findIndex((node) => node === activeElement);
      const nextIndex = currentIndex === -1 || currentIndex === targets.length - 1 ? 0 : currentIndex + 1;
      const nextTarget = targets[nextIndex];

      if (nextTarget) {
        nextTarget.focus({ preventScroll: true });
        nextTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const label = nextTarget.dataset.sectionLabel ?? `Apps starting with ${targetLetter}`;
        setAnnouncement(label);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!announcement) return;
    const timeout = setTimeout(() => setAnnouncement(''), 1500);
    return () => clearTimeout(timeout);
  }, [announcement]);

  const registerSectionRef = (letter, index) => (node) => {
    if (!sectionRefs.current[letter]) {
      sectionRefs.current[letter] = [];
    }

    const refsForLetter = sectionRefs.current[letter];

    if (node) {
      refsForLetter[index] = node;
    } else {
      refsForLetter.splice(index, 1);
    }
  };

  return (
    <div className="p-4">
      <label htmlFor="app-search" className="sr-only">
        Search apps
      </label>
      <input
        id="app-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search apps"
        className="mb-4 w-full rounded border p-2"
      />
      <p id="app-grid-shortcut-hint" className="sr-only">
        Press Alt plus a letter to jump to the next section of apps.
      </p>
      <div
        id="app-grid"
        tabIndex="-1"
        aria-describedby="app-grid-shortcut-hint"
        className="space-y-10"
      >
        {groupedApps.map(({ letter, label, apps: sectionApps }, sectionIndex) => (
          <section key={`${letter}-${sectionIndex}`} aria-labelledby={`apps-group-${letter}-${sectionIndex}`}>
            <div className="sticky top-0 z-10 -mx-4 border-b border-white/10 bg-ub-grey/95 px-4 py-2 backdrop-blur">
              <h2
                id={`apps-group-${letter}-${sectionIndex}`}
                className="text-lg font-semibold uppercase tracking-wide"
                tabIndex="-1"
                ref={registerSectionRef(letter, sectionIndex)}
                data-section-label={`Apps starting with ${label}`}
              >
                {label}
              </h2>
              <p className="sr-only">Apps starting with {label}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sectionApps.map((app) => {
                const meta = metadata[app.id] ?? buildAppMetadata(app);
                return (
                  <DelayedTooltip
                    key={app.id}
                    content={<AppTooltipContent meta={meta} />}
                  >
                    {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
                      <div
                        ref={ref}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        className="flex flex-col items-center"
                      >
                        <Link
                          href={`/apps/${app.id}`}
                          className="flex h-full w-full flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
                          aria-label={app.title}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        >
                          {app.icon && (
                            <Image
                              src={app.icon}
                              alt=""
                              width={64}
                              height={64}
                              sizes="64px"
                              className="h-16 w-16"
                            />
                          )}
                          <span className="mt-2">{app.title}</span>
                        </Link>
                      </div>
                    )}
                  </DelayedTooltip>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};

export default AppsPage;

