const SNAPSHOT_VERSION = 1 as const;

export type SnapshotVersion = typeof SNAPSHOT_VERSION;

export interface PacketLayer {
  name: string;
  fields: Record<string, string>;
}

export interface PacketFrame {
  timestamp: string;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  data: Uint8Array;
  sport?: number;
  dport?: number;
  layers: PacketLayer[];
}

export interface SerializedPacketFrame
  extends Omit<PacketFrame, 'data' | 'layers'> {
  data: string;
  layers: PacketLayer[];
}

export interface CaptureSnapshot {
  version: SnapshotVersion;
  frames: SerializedPacketFrame[];
}

const toBase64 = (bytes: Uint8Array): string => {
  if (typeof (globalThis as any).Buffer !== 'undefined') {
    return (globalThis as any).Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  throw new Error('Base64 encoding not supported in this environment');
};

const fromBase64 = (value: string): Uint8Array => {
  if (typeof (globalThis as any).Buffer !== 'undefined') {
    const buffer = (globalThis as any).Buffer.from(value, 'base64');
    return new Uint8Array(buffer);
  }
  if (typeof atob === 'function') {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('Base64 decoding not supported in this environment');
};

const cloneLayer = (layer: PacketLayer): PacketLayer => ({
  name: layer.name,
  fields: Object.fromEntries(
    Object.entries(layer.fields || {}).map(([key, val]) => [key, String(val)])
  ),
});

export const createSnapshot = (frames: PacketFrame[]): CaptureSnapshot => ({
  version: SNAPSHOT_VERSION,
  frames: frames.map((frame) => ({
    timestamp: frame.timestamp,
    src: frame.src,
    dest: frame.dest,
    protocol: frame.protocol,
    info: frame.info,
    sport: frame.sport,
    dport: frame.dport,
    data: toBase64(frame.data),
    layers: frame.layers.map(cloneLayer),
  })),
});

export const serializeCapture = (frames: PacketFrame[]): string =>
  JSON.stringify(createSnapshot(frames), null, 2);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const validateLayer = (layer: unknown, index: number): PacketLayer => {
  if (!isObject(layer)) {
    throw new Error(`Invalid layer at index ${index}`);
  }
  const name = typeof layer.name === 'string' ? layer.name : '';
  const fields = isObject(layer.fields) ? layer.fields : {};
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(fields)) {
    normalized[key] = String(val);
  }
  return { name, fields: normalized };
};

const validateFrame = (
  frame: unknown,
  index: number
): SerializedPacketFrame => {
  if (!isObject(frame)) {
    throw new Error(`Invalid frame at index ${index}`);
  }
  const { timestamp, src, dest, protocol, info, sport, dport, data, layers } =
    frame as Record<string, unknown>;
  if (typeof timestamp !== 'string' || typeof src !== 'string' || typeof dest !== 'string') {
    throw new Error(`Frame ${index} is missing required address metadata`);
  }
  if (typeof protocol !== 'number') {
    throw new Error(`Frame ${index} protocol must be numeric`);
  }
  if (typeof data !== 'string') {
    throw new Error(`Frame ${index} is missing packet payload`);
  }
  const textInfo = typeof info === 'string' ? info : '';
  const numericSport = typeof sport === 'number' ? sport : undefined;
  const numericDport = typeof dport === 'number' ? dport : undefined;
  const layerArray = Array.isArray(layers)
    ? layers.map((layer, i) => validateLayer(layer, i))
    : [];
  return {
    timestamp,
    src,
    dest,
    protocol,
    info: textInfo,
    sport: numericSport,
    dport: numericDport,
    data,
    layers: layerArray,
  };
};

export const deserializeCapture = (json: string): PacketFrame[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error('Unable to parse capture JSON');
  }
  if (!isObject(parsed)) {
    throw new Error('Invalid capture snapshot');
  }
  const { version, frames } = parsed as Record<string, unknown>;
  if (version !== SNAPSHOT_VERSION) {
    throw new Error('Unsupported capture snapshot version');
  }
  if (!Array.isArray(frames)) {
    throw new Error('Capture snapshot is missing frames');
  }
  return frames.map((frame, index) => {
    const validated = validateFrame(frame, index);
    return {
      timestamp: validated.timestamp,
      src: validated.src,
      dest: validated.dest,
      protocol: validated.protocol,
      info: validated.info,
      sport: validated.sport,
      dport: validated.dport,
      data: fromBase64(validated.data),
      layers: validated.layers.map(cloneLayer),
    };
  });
};

export const snapshotFingerprint = (frames: PacketFrame[]): string => {
  const snapshot = serializeCapture(frames);
  let hash = 0;
  for (let i = 0; i < snapshot.length; i += 1) {
    hash = (hash * 31 + snapshot.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
};

export default serializeCapture;
