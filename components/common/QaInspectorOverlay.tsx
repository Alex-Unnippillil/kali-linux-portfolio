'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { isDarkTheme } from '../../utils/theme';
import scanInteractiveElements, {
  InteractiveElementSnapshot,
} from '../../utils/dom/interactiveScanner';

const QA_TOGGLE_KEY = 'q';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable ||
    target.closest('input, textarea, [contenteditable="true"]') !== null
  );
};

const toRgba = (color: string, alpha: number): string => {
  const match = color.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
  if (match) {
    let hex = match[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (color.startsWith('rgb(') || color.startsWith('rgba(')) {
    return color.replace(/rgba?\(([^)]+)\)/, (_match, values) => {
      const parts = values
        .split(',')
        .map((value: string) => value.trim())
        .slice(0, 3);
      return `rgba(${parts.join(', ')}, ${alpha})`;
    });
  }
  return color;
};

const getElementKey = (element: HTMLElement, index: number): string => {
  return (
    element.id ||
    element.getAttribute('data-testid') ||
    element.getAttribute('aria-label') ||
    `${element.tagName.toLowerCase()}-${index}`
  );
};

interface OverlayEntry {
  key: string;
  rect: { top: number; left: number; width: number; height: number };
  label: string;
  role: string;
  tagName: string;
}

const createEntry = (
  snapshot: InteractiveElementSnapshot,
  index: number
): OverlayEntry => ({
  key: getElementKey(snapshot.element, index),
  rect: {
    top: snapshot.rect.top,
    left: snapshot.rect.left,
    width: snapshot.rect.width,
    height: snapshot.rect.height,
  },
  label: snapshot.label,
  role: snapshot.role,
  tagName: snapshot.tagName,
});

const QaInspectorOverlay: React.FC = () => {
  const { accent, theme } = useSettings();
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState<OverlayEntry[]>([]);
  const animationFrame = useRef<number | null>(null);
  const isDark = useMemo(() => isDarkTheme(theme), [theme]);

  const accentColor = useMemo(() => accent || '#1793d1', [accent]);
  const borderColor = accentColor;
  const fillColor = useMemo(
    () => toRgba(accentColor, isDark ? 0.25 : 0.18),
    [accentColor, isDark]
  );
  const labelBackground = useMemo(
    () => (isDark ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.9)'),
    [isDark]
  );
  const labelColor = useMemo(() => (isDark ? '#f8fafc' : '#0f172a'), [isDark]);

  const runScan = useCallback(() => {
    const snapshots = scanInteractiveElements();
    setEntries(snapshots.map((snapshot, index) => createEntry(snapshot, index)));
  }, []);

  const scheduleScan = useCallback(() => {
    if (!visible) return;
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    animationFrame.current = window.requestAnimationFrame(() => {
      animationFrame.current = null;
      runScan();
    });
  }, [runScan, visible]);

  useEffect(() => {
    if (!visible) return;
    scheduleScan();
  }, [scheduleScan, visible]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const isToggle =
        event.key.toLowerCase() === QA_TOGGLE_KEY &&
        event.altKey &&
        event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey;

      if (isToggle) {
        event.preventDefault();
        setVisible((open) => !open);
        return;
      }

      if (event.key === 'Escape' && visible) {
        event.preventDefault();
        setVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;

    const handlePointer = () => {
      setVisible(false);
    };

    window.addEventListener('mousedown', handlePointer, { capture: true });
    return () => {
      window.removeEventListener('mousedown', handlePointer, true);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;

    const handleResize = () => scheduleScan();
    const handleScroll = () => scheduleScan();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    const observer = new MutationObserver(() => scheduleScan());
    const target = document.body;
    if (target) {
      observer.observe(target, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    scheduleScan();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      observer.disconnect();
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    };
  }, [scheduleScan, visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1000]"
      data-qa-overlay="true"
    >
      <div
        className="pointer-events-none fixed top-4 right-4 text-sm font-medium"
        style={{
          color: labelColor,
          backgroundColor: labelBackground,
          borderRadius: '0.5rem',
          padding: '0.5rem 0.75rem',
          boxShadow: isDark
            ? '0 10px 30px rgba(15, 23, 42, 0.45)'
            : '0 10px 30px rgba(15, 23, 42, 0.12)',
        }}
      >
        QA overlay active — press Alt+Shift+Q or Escape to dismiss
      </div>
      {entries.map((entry) => {
        const { rect } = entry;
        const dimensionLabel = `${entry.label} (${entry.role}) · ${Math.round(rect.width)}×${Math.round(rect.height)}`;
        const hasRoomAbove = rect.top > 36;
        return (
          <div
            key={entry.key}
            className="pointer-events-none"
            data-qa-role={entry.role}
            data-qa-tag={entry.tagName}
            style={{
              position: 'fixed',
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              border: `2px solid ${borderColor}`,
              backgroundColor: fillColor,
              boxSizing: 'border-box',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: hasRoomAbove ? '-1.75rem' : 'auto',
                bottom: hasRoomAbove ? 'auto' : '-1.75rem',
                left: '0',
                backgroundColor: labelBackground,
                color: labelColor,
                padding: '0.125rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '0.375rem',
                whiteSpace: 'nowrap',
                boxShadow: isDark
                  ? '0 8px 20px rgba(15, 23, 42, 0.4)'
                  : '0 8px 20px rgba(15, 23, 42, 0.15)',
                transform: 'translateY(-4px)',
              }}
            >
              {dimensionLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QaInspectorOverlay;
