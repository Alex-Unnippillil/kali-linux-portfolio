"use client";

import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { settingsSubsections, type SettingsTabId } from "../navigation";

interface SubsectionSidebarProps {
  activeTab: SettingsTabId;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

const focusElement = (element: HTMLAnchorElement | null) => {
  if (element) {
    element.focus();
  }
};

const SubsectionSidebar = ({
  activeTab,
  scrollContainerRef,
}: SubsectionSidebarProps) => {
  const sections = useMemo(() => settingsSubsections[activeTab] ?? [], [activeTab]);
  const [activeSection, setActiveSection] = useState<string>(
    sections[0]?.id ?? ""
  );
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const observerRoot = scrollContainerRef.current;

  useEffect(() => {
    setActiveSection(sections[0]?.id ?? "");
  }, [sections]);

  useEffect(() => {
    if (!sections.length) {
      return;
    }

    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!targets.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);

        if (visibleEntries.length > 0) {
          const topMost = visibleEntries.reduce((closest, entry) =>
            entry.boundingClientRect.top < closest.boundingClientRect.top
              ? entry
              : closest
          );
          setActiveSection(topMost.target.id);
          return;
        }

        const nearest = [...entries].sort(
          (a, b) =>
            Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
        )[0];

        if (nearest) {
          setActiveSection(nearest.target.id);
        }
      },
      {
        root: observerRoot ?? null,
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    targets.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [sections, observerRoot]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = Math.min(index + 1, sections.length - 1);
        focusElement(linkRefs.current[nextIndex] ?? null);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        focusElement(linkRefs.current[prevIndex] ?? null);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusElement(linkRefs.current[0] ?? null);
      } else if (event.key === "End") {
        event.preventDefault();
        focusElement(linkRefs.current[sections.length - 1] ?? null);
      }
    },
    [sections.length]
  );

  if (!sections.length) {
    return null;
  }

  return (
    <aside className="w-60 shrink-0 border-r border-gray-900 bg-ub-cool-grey/70">
      <nav aria-label="Settings subsections" className="sticky top-0 max-h-full overflow-y-auto px-4 py-6">
        <ul className="flex flex-col gap-1">
          {sections.map((section, index) => {
            const isActive = section.id === activeSection;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`block rounded px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-ubt-blue/60 ${
                    isActive
                      ? "bg-ub-orange text-white"
                      : "text-ubt-grey hover:bg-ubt-grey/20"
                  }`}
                  ref={(element) => {
                    linkRefs.current[index] = element;
                  }}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default SubsectionSidebar;
