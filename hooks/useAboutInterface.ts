import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent, HTMLAttributes } from 'react';
import { SettingsContext } from './useSettings';
import type { AboutSection, AboutSectionId } from '../data/about/profile';

export interface AboutInterfaceOptions {
  sections: AboutSection[];
  storageKey?: string;
  defaultSectionId?: AboutSectionId;
  onSectionChange?: (sectionId: AboutSectionId) => void;
}

export interface AboutInterfaceController {
  sections: AboutSection[];
  activeSectionId: AboutSectionId;
  setActiveSectionId: (sectionId: AboutSectionId) => void;
  navProps: {
    role: 'tablist';
    'aria-orientation': 'vertical';
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  };
  getTabClassName: (sectionId: AboutSectionId) => string;
  getTabProps: (
    section: AboutSection
  ) => HTMLAttributes<HTMLDivElement> & {
    role: 'tab';
    id: AboutSectionId;
    tabIndex: number;
    'aria-selected': boolean;
  };
  focusRingClass: string;
  typography: {
    sectionHeading: string;
    subtle: string;
    body: string;
  };
  tokens: {
    surface: string;
    panel: string;
    border: string;
    overlay: string;
    text: string;
    subtleText: string;
  };
  liveMessage: string;
  shouldReduceMotion: boolean;
}

const FALLBACK_STORAGE_KEY = 'about-section';

const useSystemReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) {
      return undefined;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    query.addEventListener('change', handleChange);
    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
};

const buildClassNames = (shouldReduceMotion: boolean) => {
  const transitionClass = shouldReduceMotion ? '' : 'transition-colors duration-150';
  const baseTabClass = [
    'flex w-28 cursor-default select-none items-center rounded-sm px-2 py-2 text-sm md:w-full md:rounded-none md:px-3',
    'justify-start gap-2 text-left',
    'focus:outline-none',
    transitionClass,
  ]
    .filter(Boolean)
    .join(' ');

  const activeClass = [
    'border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] text-[color:var(--color-text)]',
  ].join(' ');

  const inactiveClass = [
    'text-[color:color-mix(in_srgb,var(--color-text)_68%,transparent)]',
    'hover:bg-[color:var(--kali-panel-highlight)] hover:text-[color:var(--color-text)]',
  ].join(' ');

  return { baseTabClass, activeClass, inactiveClass };
};

export function useAboutInterface({
  sections,
  storageKey = FALLBACK_STORAGE_KEY,
  defaultSectionId = sections[0]?.id ?? 'about',
  onSectionChange,
}: AboutInterfaceOptions): AboutInterfaceController {
  const { reducedMotion } = useContext(SettingsContext);
  const systemPrefersReducedMotion = useSystemReducedMotion();
  const shouldReduceMotion = Boolean(reducedMotion || systemPrefersReducedMotion);

  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);

  const resolveInitialSection = useCallback((): AboutSectionId => {
    if (typeof window === 'undefined') {
      return defaultSectionId;
    }
    try {
      const stored = window.localStorage.getItem(storageKey) as AboutSectionId | null;
      if (stored && sectionMap.has(stored)) {
        return stored;
      }
    } catch {
      // ignore storage access failures
    }
    return defaultSectionId;
  }, [defaultSectionId, sectionMap, storageKey]);

  const [activeSectionId, setActiveSectionState] = useState<AboutSectionId>(resolveInitialSection);
  const [liveMessage, setLiveMessage] = useState<string>(() => {
    const label = sectionMap.get(activeSectionId)?.label ?? activeSectionId;
    return `${label} section ready`;
  });
  const hasAnnouncedRef = useRef(false);

  useEffect(() => {
    setActiveSectionState(resolveInitialSection());
  }, [resolveInitialSection]);

  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]';

  const { baseTabClass, activeClass, inactiveClass } = useMemo(
    () => buildClassNames(shouldReduceMotion),
    [shouldReduceMotion]
  );

  const announceSection = useCallback(
    (sectionId: AboutSectionId) => {
      const label = sectionMap.get(sectionId)?.label ?? sectionId;
      setLiveMessage(`${label} section active`);
    },
    [sectionMap]
  );

  const setActiveSectionId = useCallback(
    (sectionId: AboutSectionId) => {
      if (!sectionMap.has(sectionId)) {
        return;
      }
      setActiveSectionState((current) => {
        if (current === sectionId) {
          return current;
        }
        return sectionId;
      });
      announceSection(sectionId);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, sectionId);
        }
      } catch {
        // ignore write failures (private browsing, etc.)
      }
      onSectionChange?.(sectionId);
      hasAnnouncedRef.current = true;
    },
    [announceSection, onSectionChange, sectionMap, storageKey]
  );

  useEffect(() => {
    if (!hasAnnouncedRef.current) {
      announceSection(activeSectionId);
      return;
    }
    hasAnnouncedRef.current = false;
  }, [activeSectionId, announceSection]);

  const handleNavKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const tabs = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')
      );
      if (!tabs.length) {
        return;
      }
      let index = tabs.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        index = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        index = (index - 1 + tabs.length) % tabs.length;
      } else {
        return;
      }
      const nextTab = tabs[index];
      tabs.forEach((tab, i) => {
        tab.tabIndex = i === index ? 0 : -1;
      });
      nextTab.focus();
      if (nextTab.id) {
        setActiveSectionId(nextTab.id as AboutSectionId);
      }
    },
    [setActiveSectionId]
  );

  const navProps = useMemo(
    () => ({
      role: 'tablist' as const,
      'aria-orientation': 'vertical' as const,
      onKeyDown: handleNavKeyDown,
    }),
    [handleNavKeyDown]
  );

  const getTabClassName = useCallback(
    (sectionId: AboutSectionId) =>
      [baseTabClass, sectionId === activeSectionId ? activeClass : inactiveClass, focusRingClass]
        .filter(Boolean)
        .join(' '),
    [activeClass, activeSectionId, baseTabClass, focusRingClass, inactiveClass]
  );

  const getTabProps = useCallback(
    (section: AboutSection) => ({
      id: section.id,
      role: 'tab' as const,
      tabIndex: section.id === activeSectionId ? 0 : -1,
      'aria-selected': section.id === activeSectionId,
      onFocus: () => setActiveSectionId(section.id),
      onClick: () => setActiveSectionId(section.id),
      className: getTabClassName(section.id),
    }),
    [activeSectionId, getTabClassName, setActiveSectionId]
  );

  const typography = useMemo(
    () => ({
      sectionHeading: 'text-xl font-semibold text-[color:var(--color-text)] sm:text-2xl',
      subtle: 'text-sm text-[color:color-mix(in_srgb,var(--color-text)_68%,transparent)]',
      body: 'text-base leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_80%,transparent)]',
    }),
    []
  );

  const tokens = useMemo(
    () => ({
      surface: 'bg-[color:var(--kali-surface)]',
      panel: 'bg-[color:var(--kali-panel)]',
      border: 'border-[color:var(--kali-border)]',
      overlay: 'bg-[color:var(--kali-overlay)]',
      text: 'text-[color:var(--color-text)]',
      subtleText: 'text-[color:color-mix(in_srgb,var(--color-text)_68%,transparent)]',
    }),
    []
  );

  return {
    sections,
    activeSectionId,
    setActiveSectionId,
    navProps,
    getTabClassName,
    getTabProps,
    focusRingClass,
    typography,
    tokens,
    liveMessage,
    shouldReduceMotion,
  };
}

export default useAboutInterface;
