export interface LineageMetadata {
  source: string;
  transforms: string[];
  tags: string[];
}

export interface LineageCarrier {
  lineage?: LineageMetadata;
  tags?: string[];
}

export interface LineageDefaults {
  source?: string;
  transforms?: string[];
  tags?: string[];
}

const uniqueStrings = (values: (string | undefined | null)[] = []): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => (value == null ? '' : value.trim()))
        .filter((value): value is string => value.length > 0),
    ),
  );

const mergeArrays = (
  existing: string[] | undefined,
  incoming: string[] | undefined,
  defaults: string[] | undefined,
): string[] => uniqueStrings([...(defaults ?? []), ...(existing ?? []), ...(incoming ?? [])]);

export const mergeLineage = (
  current?: LineageMetadata,
  update?: Partial<LineageMetadata>,
  defaults: LineageDefaults = {},
): LineageMetadata => {
  const transforms = mergeArrays(current?.transforms, update?.transforms, defaults.transforms);
  const tags = mergeArrays(current?.tags, update?.tags, defaults.tags);
  const source = update?.source ?? current?.source ?? defaults.source ?? 'unknown';

  return {
    source,
    transforms,
    tags,
  };
};

export const withLineage = <T extends LineageCarrier>(
  item: T,
  defaults: LineageDefaults = {},
  update: Partial<LineageMetadata> = {},
  extraTags: string[] = [],
): T & { lineage: LineageMetadata; tags: string[] } => {
  const normalizedUpdate: Partial<LineageMetadata> = {
    ...update,
    tags: mergeArrays(update.tags, extraTags, undefined),
  };

  const lineage = mergeLineage(item.lineage, normalizedUpdate, defaults);
  const tags = uniqueStrings([...(item.tags ?? []), ...lineage.tags]);

  return {
    ...item,
    lineage,
    tags,
  };
};

interface CollectionOptions<T extends LineageCarrier> {
  getUpdate?: (item: T) => Partial<LineageMetadata> | undefined;
  getExtraTags?: (item: T) => string[] | undefined;
}

export const ensureLineageCollection = <T extends LineageCarrier>(
  items: T[],
  defaults: LineageDefaults = {},
  options: CollectionOptions<T> = {},
): (T & { lineage: LineageMetadata; tags: string[] })[] =>
  items.map((item) =>
    withLineage(
      item,
      defaults,
      options.getUpdate ? options.getUpdate(item) ?? {} : {},
      options.getExtraTags ? options.getExtraTags(item) ?? [] : [],
    ),
  );

export const propagateLineage = <T extends LineageCarrier>(
  original: T,
  transform: string,
  options: {
    defaults?: LineageDefaults;
    tags?: string[];
    sourceOverride?: string;
  } = {},
): T & { lineage: LineageMetadata; tags: string[] } =>
  withLineage(
    original,
    options.defaults,
    {
      source: options.sourceOverride,
      transforms: [transform],
      tags: options.tags,
    },
  );

export const formatLineageSummary = (lineage?: LineageMetadata | null): string => {
  if (!lineage) return 'Source: unknown';
  const segments = [
    `Source: ${lineage.source || 'unknown'}`,
    lineage.transforms.length > 0
      ? `Transforms: ${lineage.transforms.join(' → ')}`
      : null,
    lineage.tags.length > 0 ? `Tags: ${lineage.tags.join(', ')}` : null,
  ].filter(Boolean);
  return segments.join(' • ');
};

export default {
  mergeLineage,
  withLineage,
  ensureLineageCollection,
  propagateLineage,
  formatLineageSummary,
};
