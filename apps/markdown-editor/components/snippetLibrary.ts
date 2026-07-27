import type {
  SnippetBuilder,
  SnippetBuilderArgs,
  SnippetBuilderResult,
} from '../state/MarkdownEditorContext';

const HEADING_PLACEHOLDER = 'Section title';
const TABLE_PLACEHOLDER = 'Item';
const TASK_PLACEHOLDER = 'First task';
const CALLOUT_PLACEHOLDER = 'Explain the callout here.';

const normalizeLine = (line: string) => line.trim();

const headingBuilder: SnippetBuilder = ({ text }) => {
  const trimmed = text.trim();
  if (trimmed) {
    const lines = text.split(/\r?\n/);
    const converted = lines
      .map((line) => {
        const normalized = normalizeLine(line);
        return normalized ? `## ${normalized}` : '## Heading';
      })
      .join('\n');
    return { text: `${converted}\n` };
  }

  const snippet = `## ${HEADING_PLACEHOLDER}\n\n`;
  const start = snippet.indexOf(HEADING_PLACEHOLDER);
  return {
    text: snippet,
    select: [start, start + HEADING_PLACEHOLDER.length],
  };
};

const detectColumns = (rows: string[][]) =>
  rows.reduce((max, row) => Math.max(max, row.length), 0);

const parseSelection = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) =>
      line
        .split(/\s*[|,\t]\s*/)
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0),
    )
    .filter((row) => row.length > 0);

const buildTableFromSelection = (text: string) => {
  const rows = parseSelection(text);
  if (!rows.length) return null;

  const columnCount = detectColumns(rows);
  if (columnCount === 0) return null;

  const normalizedRows = rows.map((row) => {
    const next = [...row];
    while (next.length < columnCount) {
      next.push('');
    }
    return next;
  });

  const [headerRow, ...bodyRows] = normalizedRows;
  const header = headerRow.map((cell, index) => cell || `Column ${index + 1}`);
  const body = bodyRows.length
    ? bodyRows
    : [header.map((_, index) => `${TABLE_PLACEHOLDER} ${index + 1}`)];

  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${new Array(columnCount).fill('---').join(' | ')} |`,
    ...body.map((row, rowIndex) =>
      `| ${row
        .map((cell, columnIndex) =>
          cell || `${TABLE_PLACEHOLDER} ${rowIndex + 1}.${columnIndex + 1}`,
        )
        .join(' | ')} |`,
    ),
  ];

  return `${lines.join('\n')}\n`;
};

const tableBuilder: SnippetBuilder = ({ text }) => {
  const converted = buildTableFromSelection(text);
  if (converted) {
    return { text: converted };
  }

  const snippet = `| Column 1 | Column 2 |\n| --- | --- |\n| ${TABLE_PLACEHOLDER} | Details |\n`;
  const start = snippet.indexOf(TABLE_PLACEHOLDER);
  return {
    text: snippet,
    select: [start, start + TABLE_PLACEHOLDER.length],
  };
};

const taskBuilder: SnippetBuilder = ({ text }) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length) {
    const list = lines
      .map((line) => line.replace(/^[-*]?\s*\[[^\]]\]\s*/, ''))
      .map((line) => `- [ ] ${line}`)
      .join('\n');
    return { text: `${list}\n` };
  }

  const snippet = `- [ ] ${TASK_PLACEHOLDER}\n- [ ] Second task\n- [ ] Third task\n`;
  const start = snippet.indexOf(TASK_PLACEHOLDER);
  return {
    text: snippet,
    select: [start, start + TASK_PLACEHOLDER.length],
  };
};

const calloutBuilder: SnippetBuilder = ({ text }) => {
  const trimmed = text.trim();
  if (trimmed) {
    const body = trimmed
      .split(/\r?\n/)
      .map((line) => `> ${line.trim()}`)
      .join('\n');
    return { text: `> [!NOTE]\n${body}\n` };
  }

  const snippet = `> [!NOTE]\n> ${CALLOUT_PLACEHOLDER}\n`;
  const start = snippet.indexOf(CALLOUT_PLACEHOLDER);
  return {
    text: snippet,
    select: [start, start + CALLOUT_PLACEHOLDER.length],
  };
};

export interface ShortcutDef {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export const parseShortcut = (shortcut: string): ShortcutDef => {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop() ?? '';
  return {
    key,
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  };
};

export const formatShortcut = (shortcut: ShortcutDef, platform: 'mac' | 'default' = 'default') => {
  const parts: string[] = [];
  if (shortcut.mod) {
    parts.push(platform === 'mac' ? '⌘' : 'Ctrl');
  }
  if (shortcut.alt) {
    parts.push(platform === 'mac' ? '⌥' : 'Alt');
  }
  if (shortcut.shift) {
    parts.push(platform === 'mac' ? '⇧' : 'Shift');
  }
  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
  return parts.join(platform === 'mac' ? '' : ' + ');
};

export interface MarkdownSnippet {
  id: string;
  label: string;
  description: string;
  preview: string;
  shortcut: string;
  build: SnippetBuilder;
}

export const SNIPPETS: readonly MarkdownSnippet[] = [
  {
    id: 'heading',
    label: 'Heading',
    description: 'Create or convert selection into a level 2 heading.',
    preview: '## Section title',
    shortcut: 'mod+shift+1',
    build: headingBuilder,
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Generate a markdown table or structure selected CSV data.',
    preview: '| Column 1 | Column 2 |\n| --- | --- |\n| Item | Details |',
    shortcut: 'mod+shift+2',
    build: tableBuilder,
  },
  {
    id: 'tasks',
    label: 'Task List',
    description: 'Turn each selected line into an unchecked task item.',
    preview: '- [ ] First task\n- [ ] Second task',
    shortcut: 'mod+shift+3',
    build: taskBuilder,
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Insert a note callout for tips, warnings, or summaries.',
    preview: '> [!NOTE]\n> Explain the callout here.',
    shortcut: 'mod+shift+4',
    build: calloutBuilder,
  },
] as const;

export type { SnippetBuilderArgs, SnippetBuilderResult };
