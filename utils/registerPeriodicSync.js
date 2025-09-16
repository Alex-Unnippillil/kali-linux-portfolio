"use client";

export const REFRESH_FEEDS_TAG = 'refresh-feeds';
const ONE_HOUR_MS = 60 * 60 * 1000;

const queryPeriodicPermission = async () => {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return null;
  }

  try {
    return await navigator.permissions.query({ name: 'periodic-background-sync' });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to query periodic background sync permission', error);
    }
    return null;
  }
};

const hasExistingRegistration = async (periodicSync) => {
  if (typeof periodicSync.getTags !== 'function') {
    return false;
  }

  try {
    const tags = await periodicSync.getTags();
    return Array.isArray(tags) && tags.includes(REFRESH_FEEDS_TAG);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Unable to read periodic sync tags', error);
    }
    return false;
  }
};

export const registerRefreshFeedsPeriodicSync = async (
  registration,
  { minInterval = ONE_HOUR_MS } = {},
) => {
  if (!registration || typeof registration.periodicSync === 'undefined') {
    return false;
  }

  const { periodicSync } = registration;

  if (await hasExistingRegistration(periodicSync)) {
    return true;
  }

  const permission = await queryPeriodicPermission();
  if (permission?.state === 'denied') {
    return false;
  }

  try {
    await periodicSync.register(REFRESH_FEEDS_TAG, {
      minInterval,
    });
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to register refresh feeds periodic sync', error);
    }
    return false;
  }
};

export const DEFAULT_REFRESH_INTERVAL = ONE_HOUR_MS;
