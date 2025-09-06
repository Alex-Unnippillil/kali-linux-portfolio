export const DEFAULT_SEND_TO = [
  { label: 'Desktop (Create Link)', action: 'desktop' },
  { label: 'Trash', action: 'trash' },
  { label: 'Archive', action: 'archive' },
];

async function loadConfigTargets() {
  try {
    const res = await fetch('/send-to.json');
    const data = await res.json();
    if (Array.isArray(data.targets)) {
      return data.targets;
    }
  } catch (e) {
    console.error('Failed to load send-to config', e);
  }
  return [];
}

export async function getSendToTargets() {
  const cfg = await loadConfigTargets();
  const stored = getUserSendToTargets();
  return [...DEFAULT_SEND_TO, ...cfg, ...stored];
}

export function getUserSendToTargets() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('send-to-targets');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse send-to-targets', e);
    return [];
  }
}

export function addUserSendToTarget(target) {
  if (typeof window === 'undefined') return;
  const targets = getUserSendToTargets();
  targets.push(target);
  window.localStorage.setItem('send-to-targets', JSON.stringify(targets));
}

export function removeUserSendToTarget(label) {
  if (typeof window === 'undefined') return;
  const targets = getUserSendToTargets().filter((t) => t.label !== label);
  window.localStorage.setItem('send-to-targets', JSON.stringify(targets));
}
