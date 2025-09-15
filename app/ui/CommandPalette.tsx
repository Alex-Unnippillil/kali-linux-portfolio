'use client';

import { useId, useMemo, useState } from 'react';

export interface CommandPaletteCommand {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
}

export interface CommandPaletteProps {
  commands: CommandPaletteCommand[];
  onCommandSelect?: (command: CommandPaletteCommand) => void;
  placeholder?: string;
  emptyStateLabel?: string;
  label?: string;
  className?: string;
}

export default function CommandPalette({
  commands,
  onCommandSelect,
  placeholder = 'Type a command',
  emptyStateLabel = 'No matching commands',
  label = 'Command palette',
  className,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  const labelId = useId();
  const inputId = useId();
  const listboxId = useId();

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCommands = useMemo(() => {
    if (!normalizedQuery) {
      return commands;
    }

    return commands.filter((command) => {
      const haystack = [
        command.label,
        command.description,
        ...(command.keywords ?? []),
      ]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [commands, normalizedQuery]);

  const rootClassName = ['flex flex-col gap-2', className]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  const hasResults = filteredCommands.length > 0;
  const isExpanded = hasResults || query.length > 0;

  // TODO: Add full keyboard navigation (arrow keys, Enter) for selecting commands.

  return (
    <div className={rootClassName}>
      <label
        id={labelId}
        className="text-xs font-semibold uppercase tracking-wide text-slate-300"
        htmlFor={inputId}
      >
        {label}
      </label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={isExpanded}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        placeholder={placeholder}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul
        id={listboxId}
        role="listbox"
        aria-labelledby={labelId}
        className="mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-slate-700 bg-slate-950 p-1 shadow-lg"
      >
        {hasResults ? (
          filteredCommands.map((command) => (
            <li
              key={command.id}
              role="option"
              aria-selected={false}
              className="flex cursor-pointer flex-col rounded px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onCommandSelect?.(command)}
            >
              <span className="font-medium">{command.label}</span>
              {command.description ? (
                <span className="text-xs text-slate-400">{command.description}</span>
              ) : null}
            </li>
          ))
        ) : (
          <li
            role="option"
            aria-disabled="true"
            className="select-none px-3 py-2 text-sm text-slate-500"
          >
            {emptyStateLabel}
          </li>
        )}
      </ul>
    </div>
  );
}
