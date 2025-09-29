import { useCallback } from 'react';

type PolitenessSetting = 'polite' | 'assertive';

const LIVE_REGION_ID = 'live-region';
let token = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const clearTimer = () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
};

const updateRegionAttributes = (region: HTMLElement, politeness: PolitenessSetting) => {
  const desiredRole = politeness === 'assertive' ? 'alert' : 'status';
  if (region.getAttribute('role') !== desiredRole) {
    region.setAttribute('role', desiredRole);
  }
  if (region.getAttribute('aria-live') !== politeness) {
    region.setAttribute('aria-live', politeness);
  }
};

export const announceToLiveRegion = (
  message: string,
  politeness: PolitenessSetting = 'polite',
) => {
  if (typeof window === 'undefined') return () => {};
  const region = document.getElementById(LIVE_REGION_ID);
  if (!region) return () => {};

  token += 1;
  const currentToken = token;
  updateRegionAttributes(region, politeness);
  clearTimer();
  region.textContent = '';

  flushTimer = setTimeout(() => {
    if (currentToken !== token) return;
    region.textContent = message;
  }, 40);

  return () => {
    if (currentToken !== token) return;
    clearTimer();
    if (region.textContent === message) {
      region.textContent = '';
    }
  };
};

export const useLiveRegionAnnouncer = (politeness: PolitenessSetting = 'polite') =>
  useCallback((message: string) => announceToLiveRegion(message, politeness), [politeness]);

export type { PolitenessSetting as LiveRegionPoliteness };
