export type DownloadRuleId = "type" | "size" | "domain";

export interface DownloadMetadata {
  name: string;
  size: number;
  mimeType?: string;
  sourceUrl?: string;
}

export interface DownloadRuleConfig {
  id: DownloadRuleId;
  enabled: boolean;
}

export interface DownloadRuleDefinition {
  id: DownloadRuleId;
  label: string;
  description: string;
  getSegments: (metadata: DownloadMetadata) => string[] | null;
  formatPreview: (metadata: DownloadMetadata) => string;
}

export interface DownloadRuleApplication {
  segments: string[];
  applied: DownloadRuleId[];
}

const STORAGE_KEY = "download-rules";
const SOURCE_META_KEY = "download-source-map";

const DEFAULT_RULE_STATE: Record<DownloadRuleId, boolean> = {
  type: true,
  size: false,
  domain: false,
};

const DEFAULT_RULE_ORDER: DownloadRuleId[] = ["type", "domain", "size"];

const TYPE_GROUPS: Record<string, string> = {
  pdf: "Documents",
  doc: "Documents",
  docx: "Documents",
  txt: "Documents",
  md: "Documents",
  rtf: "Documents",
  csv: "Spreadsheets",
  xls: "Spreadsheets",
  xlsx: "Spreadsheets",
  ods: "Spreadsheets",
  png: "Images",
  jpg: "Images",
  jpeg: "Images",
  gif: "Images",
  webp: "Images",
  svg: "Images",
  mp4: "Video",
  mkv: "Video",
  mov: "Video",
  avi: "Video",
  mp3: "Audio",
  wav: "Audio",
  flac: "Audio",
  zip: "Archives",
  rar: "Archives",
  "7z": "Archives",
  tar: "Archives",
  gz: "Archives",
};

const SIZE_BUCKETS = [
  { label: "Tiny (<1 MB)", maxBytes: 1 * 1024 * 1024 },
  { label: "Small (1-10 MB)", maxBytes: 10 * 1024 * 1024 },
  { label: "Medium (10-100 MB)", maxBytes: 100 * 1024 * 1024 },
  { label: "Large (100-500 MB)", maxBytes: 500 * 1024 * 1024 },
];

const sanitizeSegment = (segment: string): string =>
  segment.replace(/[\\/]+/g, "-").replace(/\s+/g, " ").trim() || "untitled";

const getExtension = (name: string): string => {
  const parts = name.split(".");
  if (parts.length <= 1) return "unknown";
  return parts.pop()!.toLowerCase();
};

const getDomain = (url?: string): string => {
  if (!url) return "unknown-source";
  try {
    const { hostname } = new URL(url);
    return sanitizeSegment(hostname.replace(/^www\./, ""));
  } catch {
    return "unknown-source";
  }
};

const describeType = (metadata: DownloadMetadata): string[] => {
  const ext = getExtension(metadata.name);
  const group = TYPE_GROUPS[ext] || "Other";
  return ["By Type", `${group}`];
};

const describeSize = (metadata: DownloadMetadata): string[] => {
  const size = metadata.size;
  const bucket = SIZE_BUCKETS.find((b) => size < b.maxBytes);
  if (bucket) return ["By Size", bucket.label];
  return ["By Size", "Huge (500 MB+)"];
};

const describeDomain = (metadata: DownloadMetadata): string[] => [
  "By Source",
  getDomain(metadata.sourceUrl),
];

const RULE_DEFINITIONS: Record<DownloadRuleId, DownloadRuleDefinition> = {
  type: {
    id: "type",
    label: "File type",
    description: "Group downloads into folders such as Documents, Images, or Archives based on their extension.",
    getSegments(metadata) {
      const segments = describeType(metadata).map(sanitizeSegment);
      return segments.length ? segments : null;
    },
    formatPreview(metadata) {
      const ext = getExtension(metadata.name);
      const group = TYPE_GROUPS[ext] || "Other";
      return `${group} (.${ext === "unknown" ? "?" : ext})`;
    },
  },
  size: {
    id: "size",
    label: "File size",
    description: "Create size buckets so large downloads stop crowding small attachments.",
    getSegments(metadata) {
      return describeSize(metadata).map(sanitizeSegment);
    },
    formatPreview(metadata) {
      const [_, bucket] = describeSize(metadata);
      return bucket;
    },
  },
  domain: {
    id: "domain",
    label: "Source domain",
    description: "Sort downloads by the domain that served them to keep vendors separated.",
    getSegments(metadata) {
      return describeDomain(metadata).map(sanitizeSegment);
    },
    formatPreview(metadata) {
      return getDomain(metadata.sourceUrl);
    },
  },
};

const listeners = new Set<(rules: DownloadRuleConfig[]) => void>();

const emitRules = (rules: DownloadRuleConfig[]) => {
  listeners.forEach((listener) => listener(rules));
};

const normalizeRules = (rules: DownloadRuleConfig[]): DownloadRuleConfig[] => {
  const seen = new Set<DownloadRuleId>();
  const normalized: DownloadRuleConfig[] = [];
  rules.forEach((rule) => {
    if (!rule || !RULE_DEFINITIONS[rule.id]) return;
    if (seen.has(rule.id)) return;
    seen.add(rule.id);
    normalized.push({
      id: rule.id,
      enabled: Boolean(rule.enabled),
    });
  });
  DEFAULT_RULE_ORDER.forEach((id) => {
    if (!seen.has(id)) {
      normalized.push({ id, enabled: DEFAULT_RULE_STATE[id] });
    }
  });
  return normalized;
};

export const getDefaultDownloadRules = (): DownloadRuleConfig[] =>
  DEFAULT_RULE_ORDER.map((id) => ({ id, enabled: DEFAULT_RULE_STATE[id] }));

export const getRuleDefinitions = (): DownloadRuleDefinition[] =>
  DEFAULT_RULE_ORDER.map((id) => RULE_DEFINITIONS[id]);

export const loadDownloadRules = (): DownloadRuleConfig[] => {
  if (typeof window === "undefined") return getDefaultDownloadRules();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultDownloadRules();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getDefaultDownloadRules();
    return normalizeRules(parsed as DownloadRuleConfig[]);
  } catch {
    return getDefaultDownloadRules();
  }
};

export const saveDownloadRules = (rules: DownloadRuleConfig[]): void => {
  if (typeof window === "undefined") return;
  const normalized = normalizeRules(rules);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  emitRules(normalized);
};

export const subscribeToDownloadRules = (
  listener: (rules: DownloadRuleConfig[]) => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const globalScope: typeof globalThis | undefined =
  typeof globalThis !== "undefined" ? globalThis : undefined;

if (
  globalScope &&
  typeof (globalScope as Window).addEventListener === "function"
) {
  (globalScope as Window).addEventListener("storage", (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      const rules = loadDownloadRules();
      emitRules(rules);
    }
  });
}

export const resolveDownloadPath = (
  metadata: DownloadMetadata,
  rules: DownloadRuleConfig[],
): DownloadRuleApplication => {
  const applied: DownloadRuleId[] = [];
  const segments: string[] = [];
  rules.forEach((rule) => {
    if (!rule.enabled) return;
    const def = RULE_DEFINITIONS[rule.id];
    if (!def) return;
    const result = def.getSegments(metadata);
    if (!result || result.length === 0) return;
    applied.push(rule.id);
    segments.push(...result);
  });
  return { segments, applied };
};

export const formatDownloadPreview = (
  metadata: DownloadMetadata,
  rules: DownloadRuleConfig[],
): string => {
  const { segments } = resolveDownloadPath(metadata, rules);
  if (segments.length === 0) return "Downloads";
  return ["Downloads", ...segments, metadata.name]
    .map((segment) => sanitizeSegment(segment))
    .join(" / ");
};

export const getRuleDefinition = (id: DownloadRuleId): DownloadRuleDefinition =>
  RULE_DEFINITIONS[id];

export const setDownloadSource = (name: string, url: string): void => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SOURCE_META_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[name] = url;
    window.localStorage.setItem(SOURCE_META_KEY, JSON.stringify(data));
  } catch {}
};

export const getDownloadSource = (name: string): string | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(SOURCE_META_KEY);
    if (!raw) return undefined;
    const data = JSON.parse(raw);
    const value = data?.[name];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
};

