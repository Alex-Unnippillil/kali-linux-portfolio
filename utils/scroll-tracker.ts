import { logEvent } from './analytics';
import { safeLocalStorage } from './safeStorage';

export type ScrollTrackerState = 'enter' | 'exit';

export type ScrollTrackerTrackOn = 'enter' | 'exit' | 'both';

export type ScrollTrackerOnce = boolean | 'enter' | 'exit';

type LogEventInput = Parameters<typeof logEvent>[0];

type AnalyticsProducer =
  | LogEventInput
  | ((event: ScrollTrackerEvent) => LogEventInput | null | undefined);

type ScrollTrackerAnalyticsConfig =
  | AnalyticsProducer
  | {
      enter?: AnalyticsProducer;
      exit?: AnalyticsProducer;
    };

export interface ScrollTrackerSection {
  id: string;
  selector?: string;
  element?: Element;
  trackOn?: ScrollTrackerTrackOn;
  once?: ScrollTrackerOnce;
  threshold?: number;
  analytics?: ScrollTrackerAnalyticsConfig;
}

export interface ScrollTrackerEvent {
  section: ScrollTrackerSection;
  entry: ScrollObserverEntry;
  state: ScrollTrackerState;
}

export interface ScrollTrackerOptions {
  sections?: ScrollTrackerSection[];
  debounceMs?: number;
  root?: Element | null;
  rootMargin?: string;
  defaultThreshold?: number;
  autoDiscover?: boolean;
  shouldTrack?: () => boolean;
  analyticsDispatcher?: (event: LogEventInput) => void;
  onEvent?: (event: ScrollTrackerEvent) => void;
}

export interface ScrollTrackerHandle {
  refresh: (sections?: ScrollTrackerSection[]) => void;
  disconnect: () => void;
}

interface ElementState {
  section: ScrollTrackerSection;
  visible: boolean;
  firedEnter: boolean;
  firedExit: boolean;
}

type ScrollObserverEntry = Pick<
  IntersectionObserverEntry,
  'target' | 'intersectionRatio' | 'isIntersecting' | 'boundingClientRect' | 'rootBounds' | 'intersectionRect' | 'time'
>;

interface MarketingRuntimeConfig {
  analyticsOptOut?: boolean;
  scrollTrackerSections?: ScrollTrackerSection[];
}

declare global {
  interface Window {
    __KALI_MARKETING__?: MarketingRuntimeConfig;
  }
}

const clampThreshold = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

const resolveOncePreference = (
  trackOn: ScrollTrackerTrackOn,
  once: ScrollTrackerOnce | undefined
): ScrollTrackerOnce => {
  if (typeof once === 'boolean') {
    return once;
  }

  if (once === 'enter' || once === 'exit') {
    return once;
  }

  if (trackOn === 'exit') {
    return 'exit';
  }

  if (trackOn === 'both') {
    return true;
  }

  return 'enter';
};

const DEFAULT_DEBOUNCE_MS = 250;
const DEFAULT_THRESHOLD = 0.5;
export const MARKETING_OPT_OUT_STORAGE_KEY = 'marketing:analytics-opt-out';
const SCROLL_SECTION_ATTRIBUTE = 'data-scroll-section';

const isAnalyticsStateful = (
  analytics: ScrollTrackerAnalyticsConfig
): analytics is { enter?: AnalyticsProducer; exit?: AnalyticsProducer } => {
  if (!analytics || typeof analytics !== 'object') {
    return false;
  }

  return 'enter' in analytics || 'exit' in analytics;
};

const resolveAnalyticsEvent = (
  analytics: ScrollTrackerAnalyticsConfig | undefined,
  event: ScrollTrackerEvent
): LogEventInput | null => {
  if (!analytics) {
    return {
      category: 'Scroll',
      action: `${event.state}:${event.section.id}`,
      label: event.section.id,
    };
  }

  const resolveProducer = (producer?: AnalyticsProducer): LogEventInput | null => {
    if (!producer) {
      return null;
    }

    if (typeof producer === 'function') {
      const result = producer(event);
      return result ?? null;
    }

    return producer;
  };

  if (isAnalyticsStateful(analytics)) {
    const payload = event.state === 'enter' ? analytics.enter : analytics.exit;
    return resolveProducer(payload);
  }

  return resolveProducer(analytics);
};

const defaultShouldTrack = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const flag = (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS ?? '').toLowerCase();
  const envEnabled = flag === 'true' || flag === '1';
  if (!envEnabled) {
    return false;
  }

  if (window.__KALI_MARKETING__?.analyticsOptOut) {
    return false;
  }

  const storageOptOut = safeLocalStorage?.getItem(MARKETING_OPT_OUT_STORAGE_KEY);
  return storageOptOut !== 'true';
};

const defaultAnalyticsDispatcher = (event: LogEventInput): void => {
  logEvent(event);
};

const toRect = (x: number, y: number, width: number, height: number): DOMRectReadOnly => {
  if (typeof DOMRectReadOnly !== 'undefined' && typeof DOMRectReadOnly.fromRect === 'function') {
    return DOMRectReadOnly.fromRect({ x, y, width, height });
  }

  if (typeof DOMRect !== 'undefined') {
    return new DOMRect(x, y, width, height);
  }

  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {
      return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height };
    },
  } as DOMRectReadOnly;
};

const collectThresholds = (
  sections: ScrollTrackerSection[],
  defaultThreshold: number
): number[] => {
  const values = new Set<number>([0]);

  const addValue = (value: number | undefined) => {
    if (typeof value !== 'number') return;
    values.add(clampThreshold(value));
  };

  addValue(defaultThreshold);

  sections.forEach((section) => {
    addValue(section.threshold);
  });

  return Array.from(values).sort((a, b) => a - b);
};

const normalizeSection = (
  section: ScrollTrackerSection,
  defaultThreshold: number
): ScrollTrackerSection => {
  const trackOn = section.trackOn ?? 'enter';
  const normalized: ScrollTrackerSection = {
    ...section,
    trackOn,
    once: resolveOncePreference(trackOn, section.once),
    threshold: typeof section.threshold === 'number' ? clampThreshold(section.threshold) : clampThreshold(defaultThreshold),
  };

  return normalized;
};

const resolveRuntimeSections = (): ScrollTrackerSection[] | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const runtimeSections = window.__KALI_MARKETING__?.scrollTrackerSections;
  if (!runtimeSections || runtimeSections.length === 0) {
    return undefined;
  }
  return runtimeSections.map((section) => ({ ...section }));
};

const resolveTargets = (
  sections: ScrollTrackerSection[],
  scope: Document | Element
): Array<{ element: Element; section: ScrollTrackerSection }> => {
  const results: Array<{ element: Element; section: ScrollTrackerSection }> = [];
  sections.forEach((section) => {
    if (section.element) {
      results.push({ element: section.element, section });
      return;
    }

    if (!section.selector) {
      return;
    }

    const element = scope.querySelector(section.selector);
    if (element) {
      results.push({ element, section });
    }
  });
  return results;
};

const isStateEnabled = (
  section: ScrollTrackerSection,
  state: ScrollTrackerState,
  meta: ElementState
): boolean => {
  const trackOn = section.trackOn ?? 'enter';
  if (trackOn !== 'both' && trackOn !== state) {
    return false;
  }

  const once = section.once;
  if (once === false) {
    return true;
  }

  if (once === true) {
    if (state === 'enter' && meta.firedEnter) return false;
    if (state === 'exit' && meta.firedExit) return false;
    return true;
  }

  if (once === 'enter' && state === 'enter' && meta.firedEnter) {
    return false;
  }

  if (once === 'exit' && state === 'exit' && meta.firedExit) {
    return false;
  }

  return true;
};

const processEntry = (
  entry: ScrollObserverEntry,
  meta: ElementState,
  queue: (event: ScrollTrackerEvent) => void
): void => {
  const ratio = typeof entry.intersectionRatio === 'number' ? entry.intersectionRatio : entry.isIntersecting ? 1 : 0;
  const threshold = meta.section.threshold ?? DEFAULT_THRESHOLD;
  const isVisible = ratio >= threshold;

  if (isVisible === meta.visible) {
    return;
  }

  meta.visible = isVisible;
  const state: ScrollTrackerState = isVisible ? 'enter' : 'exit';
  if (!isStateEnabled(meta.section, state, meta)) {
    return;
  }

  if (state === 'enter') {
    meta.firedEnter = true;
  } else {
    meta.firedExit = true;
  }

  queue({ section: meta.section, entry, state });
};

const createFallbackEvaluator = (
  stateMap: Map<Element, ElementState>,
  queue: (event: ScrollTrackerEvent) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let rafId: number | null = null;

  const evaluate = () => {
    rafId = null;
    const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
    const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 0;

    stateMap.forEach((meta, element) => {
      const rect = element.getBoundingClientRect();
      const intersectionWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
      const intersectionHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
      const intersectionArea = intersectionWidth * intersectionHeight;
      const targetArea = Math.max(rect.width * rect.height, 1);
      const ratio = targetArea > 0 ? Math.min(intersectionArea / targetArea, 1) : 0;

      const entry: ScrollObserverEntry = {
        target: element,
        intersectionRatio: ratio,
        isIntersecting: ratio > 0,
        boundingClientRect: rect,
        rootBounds: null,
        intersectionRect: toRect(
          Math.max(rect.left, 0),
          Math.max(rect.top, 0),
          intersectionWidth,
          intersectionHeight
        ),
        time: performance.now(),
      };

      processEntry(entry, meta, queue);
    });
  };

  const scheduleEvaluate = () => {
    if (rafId !== null) {
      return;
    }

    if (typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(() => {
        evaluate();
      });
    } else {
      rafId = window.setTimeout(() => {
        evaluate();
      }, 50);
    }
  };

  scheduleEvaluate();

  const handleScroll = () => scheduleEvaluate();
  const handleResize = () => scheduleEvaluate();
  const handleLoad = () => scheduleEvaluate();

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  window.addEventListener('load', handleLoad);

  return () => {
    if (rafId !== null) {
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
      } else {
        window.clearTimeout(rafId);
      }
      rafId = null;
    }

    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('load', handleLoad);
  };
};

export const DEFAULT_TRACKED_SECTIONS: ReadonlyArray<ScrollTrackerSection> = [
  {
    id: 'hero',
    selector: '[data-scroll-section="hero"]',
    threshold: 0.6,
    analytics: (event) => ({
      category: 'Marketing',
      action: event.state === 'enter' ? 'section_visible' : 'section_hidden',
      label: event.section.id,
    }),
    trackOn: 'both',
    once: 'enter',
  },
  {
    id: 'cta-primary',
    selector: '[data-scroll-section="cta-primary"]',
    threshold: 0.5,
    analytics: (event) => ({
      category: 'Marketing',
      action: event.state === 'enter' ? 'cta_visible' : 'cta_hidden',
      label: 'primary',
    }),
    trackOn: 'both',
    once: 'enter',
  },
  {
    id: 'cta-secondary',
    selector: '[data-scroll-section="cta-secondary"]',
    threshold: 0.5,
    analytics: (event) => ({
      category: 'Marketing',
      action: event.state === 'enter' ? 'cta_visible' : 'cta_hidden',
      label: 'secondary',
    }),
    trackOn: 'both',
    once: 'enter',
  },
];

export const discoverSectionsFromDom = (
  root: Document | Element = document
): ScrollTrackerSection[] => {
  if (typeof document === 'undefined') {
    return [];
  }

  const searchRoot = root instanceof Document ? root : root ?? document;
  if (!searchRoot) {
    return [];
  }

  const matches = searchRoot.querySelectorAll<HTMLElement>(`[${SCROLL_SECTION_ATTRIBUTE}]`);

  return Array.from(matches).map((element, index) => {
    const dataset = element.dataset;
    const id = dataset.scrollSection?.trim() || element.id || `scroll-section-${index}`;
    const trackOn = (dataset.scrollTrack as ScrollTrackerTrackOn | undefined) ?? 'enter';
    const thresholdRaw = dataset.scrollThreshold ? Number.parseFloat(dataset.scrollThreshold) : undefined;
    const threshold = typeof thresholdRaw === 'number' && !Number.isNaN(thresholdRaw) ? clampThreshold(thresholdRaw) : undefined;
    const once = dataset.scrollOnce
      ? (dataset.scrollOnce as ScrollTrackerOnce)
      : resolveOncePreference(trackOn, undefined);

    const analytics: ScrollTrackerAnalyticsConfig = {
      enter: {
        category: dataset.scrollCategory || 'Marketing',
        action: dataset.scrollAction || 'section_visible',
        label: dataset.scrollLabel || id,
        value: dataset.scrollValue ? Number.parseFloat(dataset.scrollValue) : undefined,
      },
      exit: {
        category: dataset.scrollCategory || 'Marketing',
        action: dataset.scrollExitAction || 'section_hidden',
        label: dataset.scrollLabel || id,
        value: dataset.scrollExitValue ? Number.parseFloat(dataset.scrollExitValue) : undefined,
      },
    };

    return {
      id,
      element,
      trackOn,
      once,
      threshold,
      analytics,
    };
  });
};

export const initializeScrollTracker = (
  options: ScrollTrackerOptions = {}
): ScrollTrackerHandle => {
  if (typeof window === 'undefined') {
    return {
      refresh: () => {},
      disconnect: () => {},
    };
  }

  const stateMap = new Map<Element, ElementState>();
  const pendingEvents = new Map<string, ScrollTrackerEvent>();
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const defaultThreshold = typeof options.defaultThreshold === 'number' ? options.defaultThreshold : DEFAULT_THRESHOLD;
  const shouldTrack = options.shouldTrack ?? defaultShouldTrack;
  const analyticsDispatcher = options.analyticsDispatcher ?? defaultAnalyticsDispatcher;
  const autoDiscover = options.autoDiscover !== false;
  const scope = document;

  let sections = (options.sections ?? resolveRuntimeSections() ?? (autoDiscover ? discoverSectionsFromDom() : undefined) ?? [
    ...DEFAULT_TRACKED_SECTIONS,
  ]).map((section) => normalizeSection(section, defaultThreshold));

  let observer: IntersectionObserver | null = null;
  let debounceHandle: number | null = null;
  let cleanupFallback: (() => void) | null = null;

  const queueEvent = (event: ScrollTrackerEvent) => {
    pendingEvents.set(`${event.section.id}:${event.state}`, event);
    if (debounceHandle !== null) {
      window.clearTimeout(debounceHandle);
    }
    debounceHandle = window.setTimeout(() => {
      debounceHandle = null;
      if (pendingEvents.size === 0) {
        return;
      }
      const events = Array.from(pendingEvents.values());
      pendingEvents.clear();
      events.forEach((queued) => {
        options.onEvent?.(queued);
        if (!shouldTrack()) {
          return;
        }
        const analyticsEvent = resolveAnalyticsEvent(queued.section.analytics, queued);
        if (!analyticsEvent) {
          return;
        }
        analyticsDispatcher(analyticsEvent);
      });
    }, debounceMs);
  };

  const detach = () => {
    if (debounceHandle !== null) {
      window.clearTimeout(debounceHandle);
      debounceHandle = null;
    }

    if (observer) {
      stateMap.forEach((_, element) => {
        try {
          observer?.unobserve(element);
        } catch {
          // ignore observer errors
        }
      });
      observer.disconnect();
      observer = null;
    }

    if (cleanupFallback) {
      cleanupFallback();
      cleanupFallback = null;
    }

    stateMap.clear();
    pendingEvents.clear();
  };

  const attach = () => {
    detach();

    if (sections.length === 0 && autoDiscover) {
      sections = discoverSectionsFromDom().map((section) => normalizeSection(section, defaultThreshold));
    }

    if (sections.length === 0) {
      sections = [...DEFAULT_TRACKED_SECTIONS].map((section) => normalizeSection(section, defaultThreshold));
    }

    const targets = resolveTargets(sections, scope);

    if ('IntersectionObserver' in window) {
      const thresholds = collectThresholds(sections, defaultThreshold);
      observer = new window.IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const meta = stateMap.get(entry.target);
          if (!meta) {
            return;
          }
          processEntry(entry, meta, queueEvent);
        });
      }, {
        root: options.root ?? null,
        rootMargin: options.rootMargin,
        threshold: thresholds,
      });
    }

    targets.forEach(({ element, section }) => {
      const meta: ElementState = {
        section,
        visible: false,
        firedEnter: false,
        firedExit: false,
      };
      stateMap.set(element, meta);
      if (observer) {
        observer.observe(element);
      }
    });

    if (!observer && stateMap.size > 0) {
      cleanupFallback = createFallbackEvaluator(stateMap, queueEvent);
    } else if (!observer) {
      cleanupFallback = null;
    }
  };

  attach();

  return {
    refresh: (nextSections?: ScrollTrackerSection[]) => {
      if (nextSections) {
        sections = nextSections.map((section) => normalizeSection(section, defaultThreshold));
      }
      attach();
    },
    disconnect: () => {
      detach();
    },
  };
};
