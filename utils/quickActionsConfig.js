export const QUICK_ACTION_IDS = Object.freeze([
  'new-tab',
  'record-screen',
  'open-settings',
  'lock-screen',
]);

export const DEFAULT_QUICK_ACTION_STATE = Object.freeze(
  QUICK_ACTION_IDS.map((id) => ({ id, visible: true }))
);

export const QUICK_ACTION_LABELS = Object.freeze({
  'new-tab': 'New Tab',
  'record-screen': 'Record screen',
  'open-settings': 'Open settings',
  'lock-screen': 'Lock screen',
});

export const isValidQuickActionId = (value) =>
  typeof value === 'string' && QUICK_ACTION_IDS.includes(value);
