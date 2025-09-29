'use client';

import React, { useCallback, useMemo, useState } from 'react';

interface MetadataEntry {
  label: string;
  value: string;
}

export interface ParsedBlock {
  id: string;
  title: string;
  metadata: MetadataEntry[];
  lines: string[];
  copyText: string;
}

const KNOWN_LABELS: MetadataEntry['label'][] = [
  'Authentication Id',
  'Session',
  'User Name',
  'Domain',
  'Logon Server',
  'Logon Time',
  'SID',
];

const splitIntoBlocks = (text: string): string[] => {
  const cleaned = text.replace(/\r/g, '').trim();
  if (!cleaned) {
    return [];
  }
  const hasAuthId = /\bAuthentication Id\s*:/i.test(cleaned);
  if (!hasAuthId) {
    return [cleaned];
  }
  return cleaned.split(/\n(?=Authentication Id\s*:)/i);
};

const extractValue = (block: string, label: string): string => {
  const regex = new RegExp(`${label}\\s*:\\s*(.*)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
};

export const parseOutputBlocks = (text: string): ParsedBlock[] => {
  const blocks = splitIntoBlocks(text);
  return blocks.map((block, index) => {
    const metadata = KNOWN_LABELS.reduce<MetadataEntry[]>((entries, label) => {
      const value = extractValue(block, label);
      if (value) {
        entries.push({ label, value });
      }
      return entries;
    }, []);

    const user = metadata.find((entry) => entry.label === 'User Name')?.value;
    const domain = metadata.find((entry) => entry.label === 'Domain')?.value;
    const session = metadata.find((entry) => entry.label === 'Session')?.value;
    const authId = metadata.find((entry) => entry.label === 'Authentication Id')?.value;

    const titleParts = [
      user ? (domain ? `${user} @ ${domain}` : user) : undefined,
      session,
      authId ? `ID ${authId}` : undefined,
    ].filter(Boolean) as string[];

    const title = titleParts.length ? titleParts[0]! : `Logon Session ${index + 1}`;

    const lines = block
      .split(/\n/)
      .map((line) => line.replace(/\s+$/g, ''));

    const copyText = lines.join('\n').trimEnd();

    return {
      id: authId ? authId.toLowerCase() : `session-${index}`,
      title,
      metadata,
      lines,
      copyText,
    };
  });
};

interface OutputViewProps {
  output: string;
  emptyPlaceholder?: React.ReactNode;
}

const OutputView: React.FC<OutputViewProps> = ({ output, emptyPlaceholder }) => {
  const blocks = useMemo(() => parseOutputBlocks(output), [output]);
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (blocks[0]) {
      initial[blocks[0].id] = true;
    }
    return initial;
  });

  const toggle = useCallback((id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const copyBlock = useCallback((text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }
    void navigator.clipboard.writeText(text).catch(() => undefined);
  }, []);

  if (!blocks.length) {
    return (
      <div className="text-sm text-purple-200 bg-black/60 border border-purple-700 rounded p-4">
        {emptyPlaceholder ?? 'No output captured yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block) => {
        const isOpen = !!open[block.id];
        const panelId = `output-panel-${block.id}`;

        return (
          <div
            key={block.id}
            className="border border-purple-700 bg-black/70 rounded shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-purple-800/60">
              <button
                type="button"
                className="text-left flex-1"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(block.id)}
              >
                <div className="font-semibold text-purple-100">{block.title}</div>
                <div className="text-xs text-purple-200">
                  {block.metadata
                    .filter((entry) => entry.label !== 'Authentication Id')
                    .slice(0, 2)
                    .map((entry) => (
                      <span key={entry.label} className="block">
                        {entry.label}: {entry.value}
                      </span>
                    ))}
                </div>
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-purple-100 border border-purple-300/60 rounded px-2 py-1 hover:bg-purple-700"
                onClick={() => copyBlock(block.copyText)}
                aria-label={`Copy block ${block.title}`}
              >
                Copy
              </button>
            </div>
            {isOpen && (
              <pre
                id={panelId}
                className="px-3 py-2 text-xs text-green-200 font-mono whitespace-pre-wrap bg-black/80"
              >
                {block.lines.join('\n')}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OutputView;
