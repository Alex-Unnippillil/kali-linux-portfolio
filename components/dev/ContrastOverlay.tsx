"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { scanForContrastViolations } from '../../modules/a11y/contrast-scan';

const OVERLAY_ATTRIBUTE = 'data-contrast-overlay';
const THROTTLE_DELAY = 500;

const normalizeToggles = (raw: string | null) => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
};

const isTruthy = (value: string | null) => {
  if (value === null) return false;
  if (value === '') return true;
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'on', 'yes', 'y'].includes(normalized);
};

type ThrottledFn = () => void;

const throttle = (fn: () => void, delay: number): ThrottledFn => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastRun = 0;

  return () => {
    const now = Date.now();
    const invoke = () => {
      lastRun = Date.now();
      timeout = null;
      fn();
    };

    if (now - lastRun >= delay) {
      invoke();
      return;
    }

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(invoke, Math.max(0, delay - (now - lastRun)));
  };
};

const computeActive = (searchParams: URLSearchParams, isProd: boolean) => {
  const devtoolsParam = normalizeToggles(searchParams.get('devtools'));
  const urlEnabled =
    devtoolsParam.includes('contrast') ||
    isTruthy(searchParams.get('a11yOverlay')) ||
    isTruthy(searchParams.get('contrastOverlay')) ||
    searchParams.has('contrastOverlay');

  if (urlEnabled) return true;

  try {
    const storedValue =
      window.localStorage.getItem('kali-devtools') ?? window.localStorage.getItem('devtools');
    const stored = normalizeToggles(storedValue);
    if (stored.includes('contrast')) return true;
  } catch {
    // localStorage unavailable
  }

  return false;
};

const createLabelPosition = (height: number, top: number) => {
  const offset = height >= 32 ? -24 : height + 4;
  const clampedTop = top < 24 ? height + 4 : offset;
  return clampedTop;
};

function renderHighlights(root: HTMLDivElement) {
  const violations = scanForContrastViolations({ ignoreAttribute: OVERLAY_ATTRIBUTE });
  root.replaceChildren();

  if (violations.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const violation of violations) {
    const { boundingRect, ratio, type, path } = violation;
    const highlight = document.createElement('div');
    highlight.setAttribute(OVERLAY_ATTRIBUTE, 'true');
    highlight.style.position = 'absolute';
    highlight.style.top = `${boundingRect.top}px`;
    highlight.style.left = `${boundingRect.left}px`;
    highlight.style.width = `${boundingRect.width}px`;
    highlight.style.height = `${boundingRect.height}px`;
    highlight.style.outline = `2px solid ${type === 'text' ? '#ff3b30' : '#ff9500'}`;
    highlight.style.backgroundColor = type === 'text' ? 'rgba(255, 59, 48, 0.16)' : 'rgba(255, 149, 0, 0.18)';
    highlight.style.pointerEvents = 'none';
    highlight.style.boxSizing = 'border-box';
    highlight.style.zIndex = '2147483647';

    const label = document.createElement('div');
    label.setAttribute(OVERLAY_ATTRIBUTE, 'true');
    label.textContent = `${type === 'text' ? 'Text' : 'UI'} ${ratio.toFixed(2)}:1 — ${path}`;
    label.style.position = 'absolute';
    label.style.left = '0';
    label.style.top = `${createLabelPosition(boundingRect.height, boundingRect.top)}px`;
    label.style.padding = '2px 4px';
    label.style.backgroundColor = type === 'text' ? '#ff3b30' : '#ff9500';
    label.style.color = '#000';
    label.style.fontFamily = "'Ubuntu Mono', Menlo, monospace";
    label.style.fontSize = '11px';
    label.style.fontWeight = '600';
    label.style.maxWidth = '320px';
    label.style.whiteSpace = 'normal';
    label.style.wordBreak = 'break-word';
    label.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';

    highlight.appendChild(label);
    fragment.appendChild(highlight);
  }

  root.appendChild(fragment);

  if (violations.length > 0) {
    const summary = violations.map((violation) => ({
      type: violation.type,
      ratio: violation.ratio.toFixed(2),
      path: violation.path,
      foreground: violation.foreground,
      background: violation.background,
    }));
    console.table(summary);
  }
}

export default function ContrastOverlay() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isProd = process.env.NODE_ENV === 'production';

    const update = () => {
      if (typeof window === 'undefined') {
        setEnabled(false);
        return;
      }

      const search = router.asPath.split('?')[1] || '';
      const params = new URLSearchParams(search);
      setEnabled(computeActive(params, isProd));
    };

    update();

    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('storage', update);
    };
  }, [router.asPath]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    const overlayRoot = document.createElement('div');
    overlayRoot.setAttribute(OVERLAY_ATTRIBUTE, 'true');
    overlayRoot.style.position = 'fixed';
    overlayRoot.style.inset = '0';
    overlayRoot.style.pointerEvents = 'none';
    overlayRoot.style.zIndex = '2147483647';
    overlayRoot.style.mixBlendMode = 'normal';

    document.body.appendChild(overlayRoot);

    const render = () => renderHighlights(overlayRoot);
    const throttledRender = throttle(render, THROTTLE_DELAY);

    const observer = new MutationObserver(() => {
      throttledRender();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    window.addEventListener('resize', throttledRender, { passive: true } as EventListenerOptions);
    document.addEventListener('scroll', throttledRender, true);

    throttledRender();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', throttledRender);
      document.removeEventListener('scroll', throttledRender, true);
      overlayRoot.remove();
    };
  }, [enabled]);

  return null;
}
