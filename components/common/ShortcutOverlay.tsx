'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import useKeymap, {
  ResolvedShortcut,
  SHORTCUT_IDS,
} from '../../apps/settings/keymapRegistry';

const formatEvent = (e: KeyboardEvent) => {
  const parts = [
    e.ctrlKey ? 'Ctrl' : '',
    e.altKey ? 'Alt' : '',
    e.shiftKey ? 'Shift' : '',
    e.metaKey ? 'Meta' : '',
    e.key.length === 1 ? e.key.toUpperCase() : e.key,
  ];
  return parts.filter(Boolean).join('+');
};

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { shortcuts, groups } = useKeymap();

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const shortcutLookup = useMemo(
    () => new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut])),
    [shortcuts]
  );

  const showKey = useMemo(() => {
    return shortcutLookup.get(SHORTCUT_IDS.showOverlay)?.keys || '?';
  }, [shortcutLookup]);

  const conflictedShortcuts = useMemo(
    () => shortcuts.filter((shortcut) => shortcut.conflictIds.length > 0),
    [shortcuts]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable;
      if (isInput) return;
      if (formatEvent(e) === showKey) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle, showKey]);

  const downloadFile = useCallback((content: BlobPart, type: string, filename: string) => {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore download errors
    }
  }, []);

  const handleExportMarkdown = useCallback(() => {
    const lines: string[] = ['# Keyboard Shortcuts', ''];
    groups.forEach((group) => {
      lines.push(`## ${group.context}`);
      group.shortcuts.forEach((shortcut) => {
        const keyLabel = shortcut.keys || 'Unassigned';
        lines.push(`- **${keyLabel}** — ${shortcut.description}`);
      });
      lines.push('');
    });
    downloadFile(lines.join('\n'), 'text/markdown', 'keyboard-shortcuts.md');
  }, [downloadFile, groups]);

  const handleExportPdf = useCallback(() => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Keyboard Shortcuts', 10, 15);
      doc.setFontSize(12);

      let cursorY = 25;
      const lineHeight = 6;

      groups.forEach((group, groupIndex) => {
        if (groupIndex > 0 && cursorY + lineHeight * 2 >= 285) {
          doc.addPage();
          cursorY = 20;
        }

        if (cursorY > 270) {
          doc.addPage();
          cursorY = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.text(group.context, 10, cursorY);
        cursorY += lineHeight;
        doc.setFont(undefined, 'normal');

        group.shortcuts.forEach((shortcut) => {
          const keyLabel = shortcut.keys || 'Unassigned';
          const text = `${keyLabel} — ${shortcut.description}`;
          const lines = doc.splitTextToSize(text, 190);

          if (cursorY + lines.length * lineHeight > 285) {
            doc.addPage();
            cursorY = 20;
          }

          doc.text(lines, 10, cursorY);
          cursorY += lines.length * lineHeight;
        });

        cursorY += lineHeight / 2;
      });

      doc.save('keyboard-shortcuts.pdf');
    } catch {
      // ignore PDF generation errors
    }
  }, [groups]);

  if (!open) return null;

  const renderConflictTargets = (shortcut: ResolvedShortcut) => {
    const items = shortcut.conflictIds
      .map((id) => shortcutLookup.get(id))
      .filter((item): item is ResolvedShortcut => Boolean(item));
    if (!items.length) return null;
    const label = items.map((item) => item.description).join(', ');
    return (
      <p className="mt-2 text-xs text-red-100">
        Conflicts with {label}. Resolve via{' '}
        <Link
          href="/apps/settings"
          className="underline focus:outline-none focus:ring focus:ring-ubt-blue"
        >
          Settings → Keyboard
        </Link>
        .
      </p>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-2xl w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 rounded bg-gray-700 text-sm hover:bg-gray-600 focus:outline-none focus:ring focus:ring-ubt-blue"
          >
            Export Markdown
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3 py-1.5 rounded bg-gray-700 text-sm hover:bg-gray-600 focus:outline-none focus:ring focus:ring-ubt-blue"
          >
            Export PDF
          </button>
        </div>
        {conflictedShortcuts.length > 0 && (
          <div className="rounded border border-red-500 bg-red-600/40 p-3 text-sm">
            Some shortcuts conflict with each other. Rebind them in the Settings app to avoid
            unexpected behaviour.
          </div>
        )}
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.context} aria-label={`${group.context} shortcuts`}>
              <h3 className="text-lg font-semibold border-b border-white/20 pb-1">
                {group.context}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.shortcuts.map((shortcut) => {
                  const hasConflict = shortcut.conflictIds.length > 0;
                  const scopeLabel = shortcut.scope === 'global' ? 'Global' : 'Contextual';
                  const scopeClass =
                    shortcut.scope === 'global'
                      ? 'bg-ub-orange text-black'
                      : 'bg-white/10 text-white';
                  return (
                    <li
                      key={shortcut.id}
                      data-conflict={hasConflict ? 'true' : 'false'}
                      className={`rounded border px-3 py-2 transition-colors ${
                        hasConflict
                          ? 'border-red-400 bg-red-600/40'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{shortcut.description}</span>
                          <span
                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${scopeClass}`}
                          >
                            {scopeLabel}
                          </span>
                          {shortcut.isOverride && (
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-blue-500/30">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-sm">
                          {shortcut.keys || 'Unassigned'}
                        </span>
                      </div>
                      {renderConflictTargets(shortcut)}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutOverlay;
