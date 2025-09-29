'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import caseData from '../data/case.json';

interface TimelineEntry {
  timestamp: string;
  event: string;
  thumbnail?: string;
}

interface FileNode {
  name: string;
  thumbnail?: string;
  children?: FileNode[];
}

const STORAGE_KEY = 'autopsy-case-annotations';

const getAnnotationKey = (entry: TimelineEntry) => `${entry.timestamp}|${entry.event}`;

const renderNode = (node?: FileNode): React.ReactNode => {
  if (!node) return null;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  if (hasChildren) {
    return (
      <div key={node.name} className="ml-4 space-y-1">
        <div className="flex items-center font-semibold text-sm">
          {node.thumbnail && (
            <img src={node.thumbnail} alt="" className="mr-2 h-4 w-4" />
          )}
          {node.name}
        </div>
        <div className="ml-4 space-y-1">
          {node.children?.map((child) => (
            <React.Fragment key={child.name}>{renderNode(child)}</React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div key={node.name} className="ml-4 flex items-center text-sm">
      {node.thumbnail && (
        <img src={node.thumbnail} alt="" className="mr-2 h-4 w-4" />
      )}
      {node.name}
    </div>
  );
};

const CaseWalkthrough: React.FC = () => {
  const { timeline: timelineRaw, fileTree } = caseData as {
    timeline: TimelineEntry[];
    fileTree: FileNode;
  };

  const timeline = useMemo(
    () =>
      [...timelineRaw].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [timelineRaw]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);
  const slideRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [announcement, setAnnouncement] = useState('');
  const [annotations, setAnnotations] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, string>;
      }
    } catch {
      // Ignore malformed data and fall back to empty annotations
    }
    return {};
  });

  const totalSlides = timeline.length;
  const activeEvent = timeline[activeIndex];

  useEffect(() => {
    if (!activeEvent) return;
    setAnnouncement(
      `Showing event ${activeIndex + 1} of ${totalSlides}: ${new Date(
        activeEvent.timestamp
      ).toLocaleString()} ${activeEvent.event}`
    );
  }, [activeEvent, activeIndex, totalSlides]);

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    const node = slideRefs.current[pendingFocusIndex];
    if (node) {
      node.focus();
      if (typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ block: 'nearest', inline: 'center' });
      }
    }
    setPendingFocusIndex(null);
  }, [pendingFocusIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
    } catch {
      // Swallow quota or availability issues silently
    }
  }, [annotations]);

  const goToSlide = (index: number, shouldFocus: boolean) => {
    if (totalSlides === 0) return;
    const wrappedIndex = (index + totalSlides) % totalSlides;
    setActiveIndex(wrappedIndex);
    if (shouldFocus) {
      setPendingFocusIndex(wrappedIndex);
    }
  };

  const handleSlideKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToSlide(idx + 1, true);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToSlide(idx - 1, true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goToSlide(0, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      goToSlide(totalSlides - 1, true);
    }
  };

  const handleAnnotationChange = (value: string) => {
    if (!activeEvent) return;
    const key = getAnnotationKey(activeEvent);
    setAnnotations((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  };

  const currentAnnotation = activeEvent
    ? annotations[getAnnotationKey(activeEvent)] ?? ''
    : '';

  return (
    <div className="space-y-6">
      <section aria-labelledby="case-walkthrough-timeline">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="case-walkthrough-timeline" className="text-lg font-bold">
            Timeline
          </h2>
          <span className="text-xs text-gray-400">
            Use ← → keys or buttons to move between events
          </span>
        </div>
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToSlide(activeIndex - 1, true)}
            className="rounded bg-ub-orange px-2 py-1 text-sm text-black disabled:opacity-50"
            aria-label="Show previous timeline event"
            disabled={totalSlides === 0}
          >
            Prev
          </button>
          <div className="flex-1 overflow-hidden">
            <div
              className="flex gap-2 overflow-x-auto pb-2"
              role="group"
              aria-roledescription="carousel"
              aria-label="Case timeline events"
            >
              {timeline.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`${item.timestamp}-${item.event}`}
                    ref={(el) => {
                      slideRefs.current[idx] = el;
                    }}
                    type="button"
                    className={`min-w-[12rem] rounded border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                      isActive
                        ? 'border-ub-orange bg-ub-grey'
                        : 'border-ub-cool-grey bg-ub-dark'
                    }`}
                    aria-current={isActive}
                    aria-label={`Event ${idx + 1} of ${totalSlides}: ${new Date(
                      item.timestamp
                    ).toLocaleString()} – ${item.event}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => goToSlide(idx, false)}
                    onKeyDown={(event) => handleSlideKeyDown(event, idx)}
                  >
                    <div className="flex items-center gap-2">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-8 w-8 rounded bg-ub-cool-grey object-cover"
                        />
                      ) : (
                        <div
                          className="h-8 w-8 rounded bg-ub-cool-grey"
                          aria-hidden="true"
                        />
                      )}
                      <div className="text-xs text-gray-300">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-2 text-sm font-semibold">{item.event}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => goToSlide(activeIndex + 1, true)}
            className="rounded bg-ub-orange px-2 py-1 text-sm text-black disabled:opacity-50"
            aria-label="Show next timeline event"
            disabled={totalSlides === 0}
          >
            Next
          </button>
        </div>
        {activeEvent && (
          <div className="mt-4 space-y-3 rounded bg-ub-grey p-3 text-sm">
            <div>
              <div className="font-semibold">
                {new Date(activeEvent.timestamp).toLocaleString()}
              </div>
              <div className="text-gray-200">{activeEvent.event}</div>
            </div>
            <label className="block text-xs uppercase tracking-wide text-gray-300">
              Investigator notes
              <textarea
                value={currentAnnotation}
                onChange={(event) => handleAnnotationChange(event.target.value)}
                className="mt-1 w-full rounded bg-ub-dark p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
                rows={4}
                placeholder="Capture observations, next steps, or follow-up items…"
              />
            </label>
          </div>
        )}
      </section>
      <section aria-labelledby="case-walkthrough-files">
        <h2 id="case-walkthrough-files" className="mb-2 text-lg font-bold">
          File Tree
        </h2>
        {renderNode(fileTree)}
      </section>
    </div>
  );
};

export default CaseWalkthrough;

