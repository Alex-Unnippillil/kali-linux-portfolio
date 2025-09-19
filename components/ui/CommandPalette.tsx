"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CommandDefinition } from '../../data/commands';

interface CommandPaletteProps {
  open: boolean;
  commands: CommandDefinition[];
  onClose: () => void;
}

type CommandWithScore = {
  command: CommandDefinition;
  score: number;
  index: number;
};

const getFocusableElements = (container: HTMLElement | null) => {
  if (!container) return [] as HTMLElement[];
  const selectors =
    'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors));
  return nodes.filter((node) => node.offsetParent !== null || node === container);
};

const computeFuzzyScore = (query: string, text: string) => {
  if (!query) return 1;
  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  let score = 0;
  let lastIndex = -1;
  for (let i = 0; i < normalizedQuery.length; i += 1) {
    const char = normalizedQuery[i];
    if (char === ' ') {
      score += 0.1;
      continue;
    }
    const index = normalizedText.indexOf(char, lastIndex + 1);
    if (index === -1) return 0;
    const contiguous = index === lastIndex + 1;
    if (contiguous) {
      score += 2;
    } else {
      score += 1 / (index - lastIndex);
    }
    if (index === 0 || normalizedText[index - 1] === ' ') {
      score += 1.5;
    }
    lastIndex = index;
  }
  return score / (normalizedText.length + 1);
};

const useReducedMotionPreference = () => {
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const prefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const manual = document.documentElement.classList.contains('reduce-motion');
    return prefers || manual;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const manual = document.documentElement.classList.contains('reduce-motion');
      setReduceMotion(mediaQuery.matches || manual);
    };

    update();

    mediaQuery.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      mediaQuery.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  return reduceMotion;
};

const buildDisplayString = (command: CommandDefinition) => {
  const parts = [command.label, command.description ?? '', command.id];
  if (command.keywords?.length) {
    parts.push(command.keywords.join(' '));
  }
  return parts.join(' ');
};

const CommandPalette = ({ open, commands, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotionPreference();
  const listboxId = useId();

  const normalizedQuery = query.trim();

  const rankedCommands = useMemo(() => {
    const base: CommandWithScore[] = commands.map((command, index) => ({
      command,
      index,
      score: 1,
    }));

    if (!normalizedQuery) {
      return base
        .sort((a, b) => {
          const priorityDiff = (b.command.priority ?? 0) - (a.command.priority ?? 0);
          if (priorityDiff !== 0) return priorityDiff;
          return a.command.label.localeCompare(b.command.label);
        })
        .map((entry) => entry.command);
    }

    const matches = base
      .map((entry) => ({
        ...entry,
        score: computeFuzzyScore(normalizedQuery, buildDisplayString(entry.command)),
      }))
      .filter((entry) => entry.score > 0);

    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const priorityDiff = (b.command.priority ?? 0) - (a.command.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a.index - b.index;
    });

    return matches.map((entry) => entry.command);
  }, [commands, normalizedQuery]);

  const sections = useMemo(() => {
    const result: { section: string; items: CommandDefinition[] }[] = [];
    rankedCommands.forEach((command) => {
      const sectionLabel = command.section ?? 'Commands';
      const current = result[result.length - 1];
      if (!current || current.section !== sectionLabel) {
        result.push({ section: sectionLabel, items: [command] });
      } else {
        current.items.push(command);
      }
    });
    return result;
  }, [rankedCommands]);

  const flatCommands = rankedCommands;
  const clampedIndex = flatCommands.length
    ? Math.min(Math.max(activeIndex, 0), flatCommands.length - 1)
    : -1;
  const activeOptionId =
    clampedIndex >= 0 ? `${listboxId}-option-${clampedIndex}` : undefined;

  itemsRef.current = [];

  useEffect(() => {
    if (!open) return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      previousFocusRef.current = activeElement;
    }
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (reduceMotion) {
      setIsActive(true);
      return;
    }
    setIsActive(false);
    const frame = requestAnimationFrame(() => {
      setIsActive(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    if (!normalizedQuery) {
      setActiveIndex(flatCommands.length ? 0 : -1);
      return;
    }
    setActiveIndex((prev) => {
      if (flatCommands.length === 0) return -1;
      if (prev < 0) return 0;
      return Math.min(prev, flatCommands.length - 1);
    });
  }, [flatCommands.length, normalizedQuery, open]);

  useEffect(() => {
    if (clampedIndex < 0) return;
    const item = itemsRef.current[clampedIndex];
    item?.scrollIntoView({ block: 'nearest' });
  }, [clampedIndex]);

  const selectCommand = useCallback(
    (command: CommandDefinition) => {
      onClose();
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          command.run();
        });
      } else {
        command.run();
      }
    },
    [onClose],
  );

  const runActiveCommand = useCallback(() => {
    if (clampedIndex < 0) return;
    const command = flatCommands[clampedIndex];
    if (command) {
      selectCommand(command);
    }
  }, [clampedIndex, flatCommands, selectCommand]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Tab') {
        const focusable = getFocusableElements(panelRef.current);
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const activeElement = document.activeElement as HTMLElement | null;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (activeElement === first || !panelRef.current?.contains(activeElement)) {
            event.preventDefault();
            last.focus();
          }
        } else if (activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (flatCommands.length) {
          setActiveIndex((prev) => {
            const next = prev + 1;
            if (next >= flatCommands.length) return 0;
            return next;
          });
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (flatCommands.length) {
          setActiveIndex((prev) => {
            if (prev <= 0) return flatCommands.length - 1;
            return prev - 1;
          });
        }
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        if (flatCommands.length) setActiveIndex(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        if (flatCommands.length) setActiveIndex(flatCommands.length - 1);
        return;
      }

      if (event.key === 'Enter') {
        if ((event.target as HTMLElement).tagName !== 'BUTTON') {
          event.preventDefault();
          runActiveCommand();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    },
    [flatCommands.length, onClose, runActiveCommand],
  );

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      event.preventDefault();
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  const overlayClasses = `fixed inset-0 z-[120] flex items-start justify-center bg-black/50 backdrop-blur-sm px-4 pt-24 ${
    reduceMotion ? '' : 'transition-opacity duration-150 ease-out'
  } ${isActive || reduceMotion ? 'opacity-100' : 'opacity-0'}`.trim();

  const panelClasses =
    'w-full max-w-xl rounded-lg border border-white/10 bg-ub-cool-grey/95 shadow-2xl text-white ring-1 ring-black/30';

  const contentMotionClasses = `${
    reduceMotion ? 'transition-none transform-none' : 'transition-all duration-150 ease-out'
  } ${isActive || reduceMotion ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`;

  let optionIndex = -1;

  return (
    <div
      ref={overlayRef}
      className={overlayClasses}
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
      data-testid="command-palette-backdrop"
    >
      <div
        ref={panelRef}
        className={`${panelClasses} ${contentMotionClasses}`}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
        data-testid="command-palette"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <svg
            aria-hidden="true"
            className="h-5 w-5 text-white/60"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              d="m21 21-4.35-4.35m0 0A6.5 6.5 0 1 0 10.5 17.5a6.5 6.5 0 0 0 6.15-4.85Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-base text-white placeholder:text-white/60 focus:outline-none"
            placeholder="Search commands or applications"
            aria-label="Command palette search"
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            spellCheck={false}
            data-testid="command-palette-input"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-medium text-white/70 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            Esc
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto pb-2" role="presentation">
          {flatCommands.length === 0 ? (
            <p className="px-4 py-6 text-sm text-white/70" role="status">
              No commands match your search.
            </p>
          ) : (
            <ul id={listboxId} role="listbox" aria-label="Command palette results" className="flex flex-col gap-2 py-3">
              {sections.map(({ section, items }) => (
                <li key={section} className="px-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">{section}</p>
                  <ul className="space-y-1">
                    {items.map((command) => {
                      optionIndex += 1;
                      const optionId = `${listboxId}-option-${optionIndex}`;
                      const isSelected = optionIndex === clampedIndex;
                      return (
                        <li key={command.id}>
                          <button
                            ref={(node) => {
                              itemsRef.current[optionIndex] = node;
                            }}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            id={optionId}
                            tabIndex={-1}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                              isSelected
                                ? 'bg-white/15 text-white'
                                : 'bg-white/5 text-white/90 hover:bg-white/10 focus:bg-white/10'
                            }`}
                            onMouseEnter={() => setActiveIndex(optionIndex)}
                            onClick={() => selectCommand(command)}
                          >
                            {command.icon ? (
                              <img
                                src={command.icon}
                                alt=""
                                className="h-6 w-6 flex-shrink-0 rounded-sm"
                                aria-hidden="true"
                              />
                            ) : (
                              <span
                                aria-hidden="true"
                                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm bg-white/10 text-xs font-semibold uppercase text-white/70"
                              >
                                {command.label.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <span className="flex-1">
                              <span className="block text-sm font-medium">{command.label}</span>
                              {command.description ? (
                                <span className="mt-0.5 block text-xs text-white/60">{command.description}</span>
                              ) : null}
                            </span>
                            <span className="text-[11px] uppercase tracking-wider text-white/50">{command.section}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
