'use client';

import Image from 'next/image';
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  PreparedCommand,
  fuzzySearchCommands,
  prepareCommands,
  resolveCommands,
} from '../../data/commands';
import { useSettings } from '../../hooks/useSettings';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isTextInputElement = (element: Element | null): boolean => {
  if (!element) return false;
  const tagName = element.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    (element as HTMLElement).isContentEditable
  );
};

type CommandGroup = {
  section: string;
  items: PreparedCommand[];
};

const MAX_RESULTS = 60;

const CommandPalette: React.FC = () => {
  const {
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
    setAccent,
    setWallpaper,
    setDensity,
    setReducedMotion,
    setFontScale,
    setHighContrast,
    setLargeHitAreas,
    setPongSpin,
    setAllowNetwork,
    setHaptics,
    setTheme,
  } = useSettings();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const context = useMemo(
    () => ({
      settings: {
        accent,
        wallpaper,
        density,
        reducedMotion,
        fontScale,
        highContrast,
        largeHitAreas,
        pongSpin,
        allowNetwork,
        haptics,
        theme,
      },
    }),
    [
      accent,
      wallpaper,
      density,
      reducedMotion,
      fontScale,
      highContrast,
      largeHitAreas,
      pongSpin,
      allowNetwork,
      haptics,
      theme,
    ],
  );

  const resolvedCommands = useMemo(() => resolveCommands(context), [context]);
  const preparedCommands = useMemo(() => prepareCommands(resolvedCommands), [resolvedCommands]);

  const visibleCommands = useMemo(() => {
    const results = query ? fuzzySearchCommands(query, preparedCommands) : preparedCommands;
    return results.slice(0, MAX_RESULTS);
  }, [query, preparedCommands]);

  const flatCommands = visibleCommands;

  const groupedCommands = useMemo<CommandGroup[]>(() => {
    const groups: CommandGroup[] = [];
    const map = new Map<string, CommandGroup>();
    for (const command of visibleCommands) {
      let group = map.get(command.section);
      if (!group) {
        group = { section: command.section, items: [] };
        map.set(command.section, group);
        groups.push(group);
      }
      group.items.push(command);
    }
    return groups;
  }, [visibleCommands]);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlightedIndex(0);
    activeItemRef.current = null;
    const previous = previousFocusRef.current;
    previousFocusRef.current = null;
    if (previous && typeof previous.focus === 'function') {
      previous.focus();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        const target = event.target as Element | null;
        if (!open && isTextInputElement(target)) {
          return;
        }
        event.preventDefault();
        if (open) {
          closePalette();
        } else {
          setOpen(true);
        }
      } else if (open && event.key === 'Escape') {
        event.preventDefault();
        closePalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closePalette, open]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(raf);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const count = flatCommands.length;
    if (!count) {
      setHighlightedIndex(-1);
    } else {
      setHighlightedIndex(0);
    }
  }, [open, query, flatCommands.length]);

  useEffect(() => {
    if (!open) return;
    if (highlightedIndex >= flatCommands.length && flatCommands.length > 0) {
      setHighlightedIndex(flatCommands.length - 1);
    }
  }, [flatCommands.length, highlightedIndex, open]);

  useEffect(() => {
    if (!open) return;
    const node = activeItemRef.current;
    if (node) {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  const executeCommand = useCallback(
    (command: PreparedCommand) => {
      const { action } = command;
      switch (action.type) {
        case 'open-app': {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-app', { detail: action.appId }));
          }
          break;
        }
        case 'toggle-setting': {
          switch (action.setting) {
            case 'reducedMotion':
              setReducedMotion(!reducedMotion);
              break;
            case 'highContrast':
              setHighContrast(!highContrast);
              break;
            case 'largeHitAreas':
              setLargeHitAreas(!largeHitAreas);
              break;
            case 'allowNetwork':
              setAllowNetwork(!allowNetwork);
              break;
            case 'haptics':
              setHaptics(!haptics);
              break;
            case 'pongSpin':
              setPongSpin(!pongSpin);
              break;
            default:
              break;
          }
          break;
        }
        case 'set-setting': {
          switch (action.setting) {
            case 'theme':
              setTheme(action.value as string);
              break;
            case 'density':
              setDensity(action.value as 'regular' | 'compact');
              break;
            case 'accent':
              setAccent(action.value as string);
              break;
            case 'wallpaper':
              setWallpaper(action.value as string);
              break;
            case 'fontScale':
              setFontScale(Number(action.value));
              break;
            default:
              break;
          }
          break;
        }
        case 'adjust-font': {
          const next = clamp(fontScale + action.delta, FONT_SCALE_MIN, FONT_SCALE_MAX);
          const snapped = Math.round(next / FONT_SCALE_STEP) * FONT_SCALE_STEP;
          const finalValue = clamp(snapped, FONT_SCALE_MIN, FONT_SCALE_MAX);
          setFontScale(Number(finalValue.toFixed(2)));
          break;
        }
        default:
          break;
      }
      closePalette();
    },
    [
      allowNetwork,
      closePalette,
      fontScale,
      haptics,
      highContrast,
      largeHitAreas,
      pongSpin,
      reducedMotion,
      setAccent,
      setAllowNetwork,
      setDensity,
      setFontScale,
      setHaptics,
      setHighContrast,
      setLargeHitAreas,
      setPongSpin,
      setReducedMotion,
      setTheme,
      setWallpaper,
    ],
  );

  const handleInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!open) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!flatCommands.length) return;
        setHighlightedIndex((index) => {
          if (index < 0) return 0;
          return Math.min(index + 1, flatCommands.length - 1);
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!flatCommands.length) return;
        setHighlightedIndex((index) => {
          if (index < 0) return flatCommands.length - 1;
          return Math.max(index - 1, 0);
        });
      } else if (event.key === 'Enter') {
        if (highlightedIndex < 0 || !flatCommands[highlightedIndex]) return;
        event.preventDefault();
        executeCommand(flatCommands[highlightedIndex]);
      } else if (event.key === 'Home') {
        if (!flatCommands.length) return;
        event.preventDefault();
        setHighlightedIndex(0);
      } else if (event.key === 'End') {
        if (!flatCommands.length) return;
        event.preventDefault();
        setHighlightedIndex(flatCommands.length - 1);
      }
    },
    [executeCommand, flatCommands, highlightedIndex, open],
  );

  const handleItemClick = useCallback(
    (command: PreparedCommand) => {
      executeCommand(command);
    },
    [executeCommand],
  );

  const activeCommand = highlightedIndex >= 0 ? flatCommands[highlightedIndex] : undefined;
  const activeOptionId = activeCommand ? `command-option-${activeCommand.id}` : undefined;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[1000]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePalette}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-full items-start justify-center px-4 pt-24">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              className="w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-ub-grey text-white shadow-2xl"
            >
              <div className="border-b border-white/10 px-4 py-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  role="combobox"
                  aria-expanded={open}
                  aria-controls="command-palette-options"
                  aria-activedescendant={activeOptionId}
                  placeholder="Search apps and settings..."
                  className="w-full bg-transparent text-lg leading-tight text-white placeholder:text-ubt-grey focus:outline-none"
                />
              </div>
              <div className="max-h-[60vh] overflow-y-auto py-2" id="command-palette-options" role="listbox">
                {flatCommands.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-ubt-grey">No commands match your search.</p>
                ) : (
                  groupedCommands.map((group) => {
                    let runningIndex = -1;
                    for (const existing of groupedCommands) {
                      if (existing === group) break;
                      runningIndex += existing.items.length;
                    }
                    return (
                      <div key={group.section}>
                        <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ubt-grey">
                          {group.section}
                        </div>
                        <ul className="space-y-1 px-2">
                          {group.items.map((command, index) => {
                            const absoluteIndex = runningIndex + index + 1;
                            const isActive = absoluteIndex === highlightedIndex;
                            const optionId = `command-option-${command.id}`;
                            const setRef = (node: HTMLButtonElement | null) => {
                              if (isActive) {
                                activeItemRef.current = node;
                              }
                            };
                            return (
                              <li key={command.id} role="presentation">
                                <button
                                  type="button"
                                  id={optionId}
                                  role="option"
                                  aria-selected={isActive}
                                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition focus:outline-none ${
                                    isActive ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
                                  }`}
                                  onClick={() => handleItemClick(command)}
                                  onMouseEnter={() => setHighlightedIndex(absoluteIndex)}
                                  ref={setRef}
                                  tabIndex={-1}
                                >
                                  {command.icon ? (
                                    <Image
                                      src={command.icon}
                                      alt=""
                                      width={24}
                                      height={24}
                                      className="mt-0.5 h-6 w-6 flex-shrink-0"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <span className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-md bg-white/10 text-center text-sm leading-6 text-white">
                                      {command.title.charAt(0)}
                                    </span>
                                  )}
                                  <span className="flex flex-col">
                                    <span className="text-sm font-medium text-white">{command.title}</span>
                                    {command.subtitle && (
                                      <span className="text-xs text-ubt-grey">{command.subtitle}</span>
                                    )}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommandPalette;

