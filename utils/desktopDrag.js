const DESKTOP_DRAG_MIME = 'application/x-kali-desktop-drag';
const DEFAULT_TTL = 30_000; // 30 seconds

/**
 * @typedef {Object} DesktopFileDrag
 * @property {'file'} type
 * @property {string} name
 * @property {() => Promise<File>} getFile
 * @property {string} [label]
 */

/**
 * @typedef {Object} DesktopAppDrag
 * @property {'app'} type
 * @property {string} appId
 * @property {string} title
 * @property {string} [label]
 */

/** @typedef {DesktopFileDrag | DesktopAppDrag} DesktopDragPayload */

/**
 * @typedef {Object} BeginDesktopDragOptions
 * @property {number} [ttl]
 * @property {DataTransfer['effectAllowed']} [effectAllowed]
 */

const dragStore = new Map();

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `drag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanupStore(now = Date.now()) {
  for (const [id, entry] of dragStore.entries()) {
    if (entry.expires <= now) {
      dragStore.delete(id);
    }
  }
}

/**
 * @param {DataTransfer} dataTransfer
 * @param {string} id
 * @param {DesktopDragPayload} payload
 */
function setTransferData(dataTransfer, id, payload) {
  try {
    dataTransfer.setData(
      DESKTOP_DRAG_MIME,
      JSON.stringify({ id, type: payload.type }),
    );
  } catch {
    // ignore DataTransfer errors (e.g. during tests)
  }
  const label =
    payload.type === 'file'
      ? payload.name
      : payload.label || `${payload.title} (${payload.appId})`;
  if (label) {
    try {
      dataTransfer.setData('text/plain', label);
    } catch {
      // ignore clipboard errors
    }
  }
}

/**
 * Serialize a drag payload and attach it to the provided event.
 * Returns a token that can later be cleared via {@link endDesktopDrag}.
 *
 * @param {{ dataTransfer: DataTransfer | null }} event
 * @param {DesktopDragPayload} payload
 * @param {BeginDesktopDragOptions} [options]
 * @returns {string | null}
 */
export function beginDesktopDrag(event, payload, options = {}) {
  const { dataTransfer } = event;
  if (!dataTransfer) return null;
  cleanupStore();
  const id = createId();
  dragStore.set(id, {
    payload,
    expires: Date.now() + (options.ttl ?? DEFAULT_TTL),
  });
  setTransferData(dataTransfer, id, payload);
  dataTransfer.effectAllowed = options.effectAllowed ?? 'copy';
  return id;
}

/** Remove a serialized payload once a drag concludes. */
export function endDesktopDrag(id) {
  if (!id) return;
  dragStore.delete(id);
}

function lookupPayload(dataTransfer) {
  if (!dataTransfer) return null;
  let raw = '';
  try {
    raw = dataTransfer.getData(DESKTOP_DRAG_MIME);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const meta = JSON.parse(raw);
    if (!meta?.id) return null;
    const entry = dragStore.get(meta.id);
    if (!entry) return null;
    return { id: meta.id, payload: entry.payload };
  } catch {
    return null;
  }
}

/**
 * Read the payload for the current drag without clearing it.
 * @param {DataTransfer | null} dataTransfer
 * @returns {DesktopDragPayload | null}
 */
export function peekDesktopDrag(dataTransfer) {
  const entry = lookupPayload(dataTransfer);
  return entry?.payload ?? null;
}

/**
 * Retrieve and clear the payload associated with a drop event.
 * @param {DataTransfer | null} dataTransfer
 * @returns {DesktopDragPayload | null}
 */
export function consumeDesktopDrag(dataTransfer) {
  const entry = lookupPayload(dataTransfer);
  if (!entry) return null;
  dragStore.delete(entry.id);
  return entry.payload;
}

/**
 * Determine if the provided event contains serialized desktop drag data.
 * @param {DataTransfer | null} dataTransfer
 * @returns {boolean}
 */
export function isDesktopDragEvent(dataTransfer) {
  if (!dataTransfer?.types) return false;
  const types = Array.from(dataTransfer.types);
  return types.includes(DESKTOP_DRAG_MIME);
}

export const desktopDragInternal = {
  /** Primarily for tests */
  _store: dragStore,
  _mime: DESKTOP_DRAG_MIME,
};
