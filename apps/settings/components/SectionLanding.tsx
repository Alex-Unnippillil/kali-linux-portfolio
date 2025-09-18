'use client';

import { ChangeEvent, ReactNode, useMemo } from "react";
import type { RecentSettingChange } from "../../../hooks/useSettings";

export interface FeaturedControl {
  id: string;
  label: string;
  description?: string;
  control: ReactNode;
}

export interface SectionMetadata {
  id: string;
  title: string;
  description: string;
  featuredControls: FeaturedControl[];
  searchPlaceholder?: string;
}

interface SectionLandingProps {
  section: SectionMetadata;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  recentChanges: RecentSettingChange[];
}

const formatTimestamp = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch (error) {
    return new Date(timestamp).toLocaleString();
  }
};

const SectionLanding = ({
  section,
  searchQuery,
  onSearchQueryChange,
  recentChanges,
}: SectionLandingProps) => {
  const displayedChanges = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const relevant = recentChanges.filter(
      (change) => change.section === section.id || change.section === "general"
    );
    if (!normalizedQuery) {
      return relevant.slice(0, 6);
    }
    return relevant
      .filter((change) => {
        const haystack = `${change.label} ${change.value}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 6);
  }, [recentChanges, section.id, searchQuery]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchQueryChange(event.target.value);
  };

  return (
    <section className="border-b border-gray-900 bg-black/40 px-4 py-6 text-ubt-grey">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
            <p className="text-sm text-ubt-grey">{section.description}</p>
          </div>
          <div className="w-full md:w-72">
            <label
              htmlFor={`settings-search-${section.id}`}
              className="sr-only"
            >
              Search {section.title}
            </label>
            <input
              id={`settings-search-${section.id}`}
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={section.searchPlaceholder ?? "Search settings"}
              className="w-full rounded border border-gray-800 bg-ub-cool-grey px-3 py-2 text-sm text-white focus:border-ub-orange focus:outline-none"
            />
          </div>
        </div>
        {section.featuredControls.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey">
              Featured controls
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {section.featuredControls.map((item) => (
                <article
                  key={item.id}
                  className="rounded border border-gray-800 bg-black/30 p-4 shadow-inner"
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {item.label}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-ubt-grey">{item.description}</p>
                      )}
                    </div>
                    <div className="text-sm text-white">{item.control}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey">
            Recent changes
          </h3>
          {displayedChanges.length === 0 ? (
            <p className="text-xs text-ubt-grey">
              No recent changes recorded yet.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {displayedChanges.map((change) => (
                <li
                  key={`${change.key}-${change.timestamp}`}
                  className="flex items-center justify-between rounded border border-gray-800 bg-black/20 px-3 py-2"
                >
                  <div className="flex flex-col gap-1 text-left">
                    <span className="font-medium text-white">{change.label}</span>
                    <span className="text-xs text-ubt-grey">
                      {change.value || "Updated"}
                    </span>
                  </div>
                  <time
                    className="text-xs text-ubt-grey"
                    dateTime={new Date(change.timestamp).toISOString()}
                  >
                    {formatTimestamp(change.timestamp)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default SectionLanding;
