import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { SnapTarget } from '@/modules/desktop/windowManager';
import { useGlobalShortcuts, ShortcutDescriptor } from '@/hooks/useGlobalShortcuts';

interface KeyboardShortcutConfig {
  toggle?: ShortcutDescriptor;
  next?: ShortcutDescriptor;
  previous?: ShortcutDescriptor;
  confirm?: ShortcutDescriptor;
  cancel?: ShortcutDescriptor;
}

export interface SnapTargetsProps {
  targets: SnapTarget[];
  isDragging?: boolean;
  onSelect?: (target: SnapTarget) => void;
  onCancel?: () => void;
  keyboard?: KeyboardShortcutConfig;
  showLabels?: boolean;
}

const defaultShortcuts: Required<KeyboardShortcutConfig> = {
  toggle: {
    key: ' ',
    ctrlKey: true,
    altKey: true,
    preventDefault: true,
  },
  next: {
    key: 'ArrowRight',
    ctrlKey: true,
    altKey: true,
    preventDefault: true,
  },
  previous: {
    key: 'ArrowLeft',
    ctrlKey: true,
    altKey: true,
    preventDefault: true,
  },
  confirm: {
    key: 'Enter',
    ctrlKey: true,
    altKey: true,
    preventDefault: true,
  },
  cancel: {
    key: 'Escape',
    preventDefault: true,
  },
};

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const baseTargetStyle: React.CSSProperties = {
  position: 'absolute',
  borderRadius: '0.75rem',
  border: '2px dashed rgba(59, 130, 246, 0.45)',
  backgroundColor: 'rgba(59, 130, 246, 0.12)',
  color: '#f8fafc',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  fontSize: '0.75rem',
  padding: '0.5rem',
  pointerEvents: 'auto',
  transition: 'border-color 120ms ease, background-color 120ms ease',
};

const activeTargetStyle: React.CSSProperties = {
  border: '2px solid rgba(37, 99, 235, 0.95)',
  backgroundColor: 'rgba(37, 99, 235, 0.2)',
  boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
};

const SnapTargets: React.FC<SnapTargetsProps> = ({
  targets,
  isDragging = false,
  onSelect,
  onCancel,
  keyboard,
  showLabels = true,
}) => {
  const shortcuts = useMemo(() => ({
    toggle: keyboard?.toggle ?? defaultShortcuts.toggle,
    next: keyboard?.next ?? defaultShortcuts.next,
    previous: keyboard?.previous ?? defaultShortcuts.previous,
    confirm: keyboard?.confirm ?? defaultShortcuts.confirm,
    cancel: keyboard?.cancel ?? defaultShortcuts.cancel,
  }), [keyboard]);

  const [keyboardMode, setKeyboardMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const visible = isDragging || keyboardMode;

  useEffect(() => {
    if (!targets.length) {
      setActiveIndex(-1);
      setKeyboardMode(false);
    } else if (keyboardMode && activeIndex >= targets.length) {
      setActiveIndex(targets.length - 1);
    }
  }, [targets, keyboardMode, activeIndex]);

  useEffect(() => {
    if (!keyboardMode && !isDragging) {
      setActiveIndex(-1);
    }
  }, [keyboardMode, isDragging]);

  const commitSelection = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= targets.length) return;
    const target = targets[activeIndex];
    if (!target) return;
    onSelect?.(target);
  }, [activeIndex, onSelect, targets]);

  const toggleKeyboard = useCallback(() => {
    setKeyboardMode((prev) => {
      const next = !prev;
      if (next && targets.length) {
        setActiveIndex((index) => (index >= 0 ? index : 0));
      }
      if (!next) {
        setActiveIndex(-1);
        onCancel?.();
      }
      return next;
    });
  }, [targets.length, onCancel]);

  const cycle = useCallback((direction: 1 | -1) => {
    if (!targets.length) return;
    setKeyboardMode(true);
    setActiveIndex((prev) => {
      if (prev < 0) {
        return direction > 0 ? 0 : targets.length - 1;
      }
      const next = (prev + direction + targets.length) % targets.length;
      return next;
    });
  }, [targets.length]);

  const handleCancel = useCallback(() => {
    if (!keyboardMode) return;
    setKeyboardMode(false);
    setActiveIndex(-1);
    onCancel?.();
  }, [keyboardMode, onCancel]);

  useGlobalShortcuts([
    {
      ...shortcuts.toggle,
      handler: () => toggleKeyboard(),
    },
    {
      ...shortcuts.next,
      enabled: keyboardMode || visible,
      handler: () => cycle(1),
    },
    {
      ...shortcuts.previous,
      enabled: keyboardMode || visible,
      handler: () => cycle(-1),
    },
    {
      ...shortcuts.confirm,
      enabled: keyboardMode,
      handler: () => {
        commitSelection();
        setKeyboardMode(false);
        setActiveIndex(-1);
      },
    },
    {
      ...shortcuts.cancel,
      enabled: keyboardMode,
      handler: () => handleCancel(),
    },
  ], [keyboardMode, visible, cycle, commitSelection, handleCancel, toggleKeyboard]);

  const handleTargetClick = useCallback(
    (target: SnapTarget, index: number) => {
      onSelect?.(target);
      setKeyboardMode(false);
      setActiveIndex(index);
    },
    [onSelect]
  );

  return (
    <div
      data-testid="snap-targets-overlay"
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        pointerEvents: visible ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 120ms ease',
      }}
    >
      {targets.map((target, index) => {
        const isActive = index === activeIndex && (keyboardMode || isDragging);
        return (
          <button
            type="button"
            key={target.id}
            data-testid={`snap-target-${target.id}`}
            aria-label={target.label}
            aria-current={isActive}
            onClick={() => handleTargetClick(target, index)}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onMouseLeave={() => {
              if (!keyboardMode && !isDragging) {
                setActiveIndex(-1);
              }
            }}
            onBlur={() => {
              if (!keyboardMode && !isDragging) {
                setActiveIndex(-1);
              }
            }}
            style={{
              ...baseTargetStyle,
              ...(isActive ? activeTargetStyle : {}),
              left: `${target.rect.x}px`,
              top: `${target.rect.y}px`,
              width: `${target.rect.width}px`,
              height: `${target.rect.height}px`,
            }}
          >
            <span style={srOnlyStyle}>{target.label}</span>
            {showLabels && (
              <span aria-hidden className="text-xs font-semibold text-slate-100">
                {target.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SnapTargets;
