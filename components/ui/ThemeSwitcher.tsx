"use client";

import clsx from 'clsx';
import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useSettings } from '../../hooks/useSettings';

type ThemeOptionId = 'default' | 'dark' | 'hc';

type ThemeOption = {
  id: ThemeOptionId;
  label: string;
  description: string;
  Icon: (props: { className?: string }) => JSX.Element;
};

type ThemeSwitcherProps = {
  className?: string;
  focusableTabIndex?: number;
};

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    id: 'default',
    label: 'Kali',
    description: 'Balanced neon accents with AAA text contrast.',
    Icon: SunIcon,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Low-light palette with softened highlights.',
    Icon: MoonIcon,
  },
  {
    id: 'hc',
    label: 'High contrast',
    description: 'Pure black surfaces with yellow/cyan focus cues.',
    Icon: ContrastIcon,
  },
] as const;

export const THEME_LABELS: Record<string, string> = {
  default: 'Kali',
  dark: 'Dark',
  neon: 'Neon',
  matrix: 'Matrix',
  hc: 'High contrast',
};

const ThemeSwitcher = ({ className, focusableTabIndex = 0 }: ThemeSwitcherProps) => {
  const { theme, setTheme, highContrast, setHighContrast } = useSettings();

  useEffect(() => {
    if (theme === 'hc' && !highContrast) {
      setHighContrast(true);
    }
  }, [theme, highContrast, setHighContrast]);

  const handleSelect = (next: ThemeOptionId) => {
    if (next === theme) return;

    setTheme(next);
    if (next === 'hc') {
      if (!highContrast) {
        setHighContrast(true);
      }
    } else if (highContrast) {
      setHighContrast(false);
    }
  };

  return (
    <div
      className={clsx('grid gap-2', className)}
      role="radiogroup"
      aria-label="Theme options"
    >
      {THEME_OPTIONS.map(({ id, label, description, Icon }) => {
        const isActive = theme === id;
        const descriptionId = `${id}-description`;
        const baseStyles: CSSProperties = {
          color: 'var(--kali-text)',
          borderColor:
            'color-mix(in srgb, var(--kali-border, var(--color-border, #ffffff)) 35%, transparent)',
          backgroundColor: 'var(--kali-panel-highlight)',
          outlineColor: 'var(--focus-outline-color)',
        };
        const activeStyles: CSSProperties = isActive
          ? {
              borderColor: 'var(--kali-border, var(--color-border))',
              backgroundColor: 'var(--kali-control-overlay)',
              boxShadow:
                '0 0 0 1px color-mix(in srgb, var(--kali-border, var(--color-border, #ffffff)) 45%, transparent)',
            }
          : {
              backgroundColor: 'color-mix(in srgb, var(--kali-panel-highlight) 75%, rgba(255,255,255,0.08))',
            };

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-describedby={description ? descriptionId : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-150',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              isActive
                ? 'font-semibold'
                : 'hover:border-[color:var(--kali-border)] hover:bg-[color:var(--kali-panel-highlight-strong)]',
            )}
            style={{ ...baseStyles, ...activeStyles }}
            onClick={() => handleSelect(id)}
            tabIndex={focusableTabIndex}
          >
            <span aria-hidden className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--kali-panel,rgba(15,23,42,0.9))]">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span>{label}</span>
              <span id={descriptionId} className="text-xs" style={{ color: 'var(--kali-text-subtle)' }}>
                {description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitcher;

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 4.5V2M12 22v-2.5M5.64 5.64 4.22 4.22M19.78 19.78l-1.42-1.42M4.5 12H2M22 12h-2.5M5.64 18.36 4.22 19.78M19.78 4.22 18.36 5.64M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 7 7 0 1 0 20.5 15.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ContrastIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 4a8 8 0 1 0 0 16V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4a8 8 0 0 1 0 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
