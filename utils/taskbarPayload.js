export const PINNED_APPS_PAYLOAD_KIND = 'taskbar-pinned-apps';
export const PINNED_APPS_PAYLOAD_VERSION = 1;

const normalizePinnedApps = (payload) => {
  if (!Array.isArray(payload)) return [];
  return payload.filter((item) => item && typeof item.id !== 'undefined');
};

export const buildPinnedAppsPayload = (items) => ({
  kind: PINNED_APPS_PAYLOAD_KIND,
  version: PINNED_APPS_PAYLOAD_VERSION,
  items: normalizePinnedApps(items),
});

export const parsePinnedAppsPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return normalizePinnedApps(payload);
  }
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return parsePinnedAppsPayload(parsed);
    } catch (error) {
      return [];
    }
  }
  if (typeof payload === 'object') {
    const kind = payload.kind || payload.type;
    if (kind && kind !== PINNED_APPS_PAYLOAD_KIND) {
      return [];
    }
    return normalizePinnedApps(payload.items);
  }
  return [];
};
