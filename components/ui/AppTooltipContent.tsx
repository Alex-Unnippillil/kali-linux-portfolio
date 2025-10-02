"use client";

import React, { useMemo } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';

type AppTooltipContentProps = {
  meta?: {
    title?: string;
    description?: string;
    path?: string;
    keyboard?: string[];
  } | null;
};

const splitHint = (hint: string): { key: string | null; description: string } => {
  const parts = hint.split(' — ');
  if (parts.length >= 2) {
    const [key, ...rest] = parts;
    return { key: key.trim(), description: rest.join(' — ').trim() };
  }
  return { key: null, description: hint };
};

const AppTooltipContent: React.FC<AppTooltipContentProps> = ({ meta }) => {
  const { shortcuts } = useKeymap();

  const shortcutMap = useMemo(() => {
    const map = new Map<string, string>();
    shortcuts.forEach(({ description, keys }) => {
      map.set(description, keys);
    });
    return map;
  }, [shortcuts]);

  const hints = useMemo(() => {
    if (!meta?.keyboard?.length) {
      return [] as Array<{ key: string | null; description: string }>;
    }
    return meta.keyboard.map((hint) => {
      const parsed = splitHint(hint);
      const override = parsed.description
        ? shortcutMap.get(parsed.description)
        : null;
      return {
        key: override ?? parsed.key,
        description: parsed.description,
      };
    });
  }, [meta?.keyboard, shortcutMap]);

  if (!meta) {
    return (
      <span
        className="text-xs opacity-80"
        style={{ color: 'var(--color-text)' }}
      >
        Metadata unavailable.
      </span>
    );
  }

  return (
    <div className="space-y-2" style={{ color: 'var(--color-text)' }}>
      {meta.title ? (
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {meta.title}
        </p>
      ) : null}
      {meta.description ? (
        <p className="text-xs leading-relaxed opacity-90">
          {meta.description}
        </p>
      ) : null}
      {meta.path ? (
        <p className="text-[11px] opacity-80">
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
            Path:
          </span>{' '}
          <code
            className="rounded px-1 py-0.5 text-[11px] bg-black/40 dark:bg-white/10"
            style={{
              color: 'var(--color-text)',
              backgroundColor: 'color-mix(in srgb, var(--color-muted) 70%, transparent)',
            }}
          >
            {meta.path}
          </code>
        </p>
      ) : null}
      {hints.length ? (
        <ul className="space-y-1 text-[11px]">
          {hints.map(({ key, description }) => (
            <li
              key={`${description}-${key ?? 'none'}`}
              className="flex items-center justify-between gap-3 rounded border border-white/10 bg-black/30 px-2 py-1 dark:border-white/10 dark:bg-white/10"
              style={{
                color: 'var(--color-text)',
                backgroundColor:
                  'color-mix(in srgb, var(--color-muted) 55%, transparent)',
                borderColor:
                  'color-mix(in srgb, var(--color-border) 65%, transparent)',
              }}
            >
              <span className="truncate opacity-90">{description}</span>
              {key ? (
                <kbd
                  className="ml-4 shrink-0 rounded border border-white/20 bg-black/40 px-2 py-0.5 text-[11px] font-semibold font-mono dark:border-white/20 dark:bg-white/10"
                  style={{
                    color: 'var(--color-text)',
                    backgroundColor:
                      'color-mix(in srgb, var(--color-surface) 65%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--color-border) 70%, transparent)',
                  }}
                >
                  {key}
                </kbd>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default AppTooltipContent;
