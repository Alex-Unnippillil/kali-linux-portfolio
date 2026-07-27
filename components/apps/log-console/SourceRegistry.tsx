'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import seedSources from '../../../data/log-console/sources.json';

export interface LogLevelMetadata {
  label: string;
  color: string;
  severity: number;
  description?: string;
}

export type LogLevelMap = Record<string, LogLevelMetadata>;

export interface LogField {
  key: string;
  label: string;
  type: string;
  description?: string;
  example?: string;
}

export interface LogChannel {
  id: string;
  name: string;
  description?: string;
  fields: LogField[];
  levelMap: LogLevelMap;
}

export interface LogSource {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  channels: LogChannel[];
}

export interface SourceRegistryContextValue {
  sources: LogSource[];
  registerSource: (source: LogSource) => LogSource;
  registerChannel: (
    sourceId: string,
    channel: LogChannel,
    sourceName?: string,
  ) => LogChannel;
  removeChannel: (sourceId: string, channelId: string) => boolean;
  unregisterSource: (sourceId: string) => boolean;
  reset: () => void;
}

let generatedIdCounter = 0;

export const slugify = (value: string): string => {
  const raw = `${value ?? ''}`.trim().toLowerCase();
  if (!raw) {
    return '';
  }
  const slug = raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug;
};

const ensureIdentifier = (value: string | undefined, prefix: string) => {
  const slug = value ? slugify(value) : '';
  if (slug) {
    return slug;
  }
  generatedIdCounter += 1;
  return `${prefix}-${generatedIdCounter}`;
};

const toTitleCase = (value: string) => {
  if (!value) {
    return '';
  }
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const fallbackFields: LogField[] = [
  { key: 'timestamp', label: 'Timestamp', type: 'datetime' },
  { key: 'message', label: 'Message', type: 'text' },
];

const fallbackLevels: LogLevelMap = {
  info: { label: 'Info', severity: 20, color: '#2563EB' },
  warning: { label: 'Warning', severity: 30, color: '#D97706' },
  error: { label: 'Error', severity: 40, color: '#DC2626' },
};

const normalizeField = (field: Partial<LogField>, index: number): LogField => {
  const key = field.key?.trim() || `field-${index + 1}`;
  return {
    key,
    label: field.label?.trim() || toTitleCase(key),
    type: field.type?.trim() || 'string',
    description: field.description?.trim() || undefined,
    example: field.example,
  };
};

const dedupeByKey = <T extends { key: string }>(items: T[]) => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    map.set(item.key, item);
  });
  return Array.from(map.values());
};

const sortFields = (fields: LogField[]) =>
  [...fields].sort((a, b) => a.label.localeCompare(b.label));

const sortChannelsList = (channels: LogChannel[]) =>
  [...channels].sort((a, b) => a.name.localeCompare(b.name));

const sortSourcesList = (sources: LogSource[]) =>
  [...sources].sort((a, b) => a.name.localeCompare(b.name));

const normalizeChannel = (channel: LogChannel, index: number): LogChannel => {
  const id = ensureIdentifier(channel.id ?? channel.name, 'channel');
  const name = channel.name?.trim() || toTitleCase(id);
  const fieldsRaw = channel.fields?.length
    ? channel.fields.map((field, idx) => normalizeField(field, idx))
    : fallbackFields;
  const fields = sortFields(dedupeByKey(fieldsRaw));

  const entries = Object.entries(channel.levelMap ?? {}).map(
    ([levelKey, meta], levelIndex) => {
      const key = levelKey?.trim() || `level-${levelIndex + 1}`;
      const severity = Number.isFinite(meta?.severity)
        ? Number(meta?.severity)
        : (levelIndex + 1) * 10;
      return [
        key,
        {
          label: meta?.label?.trim() || toTitleCase(key),
          color: meta?.color || '#2563EB',
          severity,
          description: meta?.description?.trim() || undefined,
        },
      ] as const;
    },
  );

  const levelMap = entries.length
    ? Object.fromEntries(entries)
    : { ...fallbackLevels };

  return {
    id,
    name,
    description: channel.description?.trim() || undefined,
    fields,
    levelMap,
  };
};

const dedupeChannels = (channels: LogChannel[]) => {
  const map = new Map<string, LogChannel>();
  channels.forEach((channel, index) => {
    const normalized = normalizeChannel(channel, index);
    map.set(normalized.id, normalized);
  });
  return sortChannelsList(Array.from(map.values()));
};

const normalizeSource = (source: LogSource, index: number): LogSource => {
  const id = ensureIdentifier(source.id ?? source.name, 'source');
  const name = source.name?.trim() || toTitleCase(id);
  const channels = dedupeChannels(source.channels ?? []);

  return {
    id,
    name,
    description: source.description?.trim() || undefined,
    tags: source.tags?.length ? source.tags : undefined,
    channels,
  };
};

const dedupeSources = (sources: LogSource[] | unknown): LogSource[] => {
  if (!Array.isArray(sources)) {
    return [];
  }
  const map = new Map<string, LogSource>();
  sources.forEach((source, index) => {
    const normalized = normalizeSource(source as LogSource, index);
    map.set(normalized.id, normalized);
  });
  return sortSourcesList(Array.from(map.values()));
};

const mergeChannels = (existing: LogChannel, incoming: LogChannel): LogChannel => {
  const fieldMap = new Map<string, LogField>();
  existing.fields.forEach((field) => fieldMap.set(field.key, field));
  incoming.fields.forEach((field) => fieldMap.set(field.key, field));
  const fields = sortFields(Array.from(fieldMap.values()));

  return {
    ...existing,
    ...incoming,
    description: incoming.description ?? existing.description,
    fields,
    levelMap: { ...existing.levelMap, ...incoming.levelMap },
  };
};

const mergeSources = (existing: LogSource, incoming: LogSource): LogSource => {
  const channelMap = new Map<string, LogChannel>();
  existing.channels.forEach((channel) => channelMap.set(channel.id, channel));
  incoming.channels.forEach((channel) => {
    const current = channelMap.get(channel.id);
    channelMap.set(
      channel.id,
      current ? mergeChannels(current, channel) : channel,
    );
  });
  const channels = sortChannelsList(Array.from(channelMap.values()));

  return {
    ...existing,
    ...incoming,
    description: incoming.description ?? existing.description,
    tags: incoming.tags ?? existing.tags,
    channels,
  };
};

const seededSources = dedupeSources(seedSources as LogSource[]);

const SourceRegistryContext =
  createContext<SourceRegistryContextValue | undefined>(undefined);

interface SourceRegistryProviderProps {
  children: ReactNode;
  initialSources?: LogSource[];
}

export const SourceRegistryProvider = ({
  children,
  initialSources,
}: SourceRegistryProviderProps) => {
  const normalizedInitial = useMemo(
    () => dedupeSources(initialSources ?? seededSources),
    [initialSources],
  );
  const seedsRef = useRef<LogSource[]>(normalizedInitial);
  const [sources, setSources] = useState<LogSource[]>(normalizedInitial);

  useEffect(() => {
    seedsRef.current = normalizedInitial;
    setSources(normalizedInitial);
  }, [normalizedInitial]);

  const registerSource = useCallback((source: LogSource) => {
    const normalized = normalizeSource(source, 0);
    let finalSource = normalized;

    setSources((prev) => {
      const index = prev.findIndex((item) => item.id === normalized.id);
      if (index === -1) {
        finalSource = normalized;
        return sortSourcesList([...prev, normalized]);
      }
      const merged = mergeSources(prev[index], normalized);
      finalSource = merged;
      const next = [...prev];
      next[index] = merged;
      return sortSourcesList(next);
    });

    return finalSource;
  }, []);

  const registerChannel = useCallback(
    (sourceId: string, channel: LogChannel, sourceName?: string) => {
      const canonicalSourceId = slugify(sourceId) || sourceId;
      const normalizedChannel = normalizeChannel(channel, 0);
      let finalChannel = normalizedChannel;

      setSources((prev) => {
        const index = prev.findIndex((item) => item.id === canonicalSourceId);
        if (index === -1) {
          const createdSource = normalizeSource(
            {
              id: canonicalSourceId,
              name: sourceName ?? toTitleCase(canonicalSourceId),
              channels: [normalizedChannel],
            },
            0,
          );
          finalChannel = createdSource.channels[0];
          return sortSourcesList([...prev, createdSource]);
        }

        const existingSource = prev[index];
        const channelIndex = existingSource.channels.findIndex(
          (item) => item.id === normalizedChannel.id,
        );

        let nextChannels: LogChannel[];
        if (channelIndex === -1) {
          finalChannel = normalizedChannel;
          nextChannels = sortChannelsList([
            ...existingSource.channels,
            normalizedChannel,
          ]);
        } else {
          const mergedChannel = mergeChannels(
            existingSource.channels[channelIndex],
            normalizedChannel,
          );
          finalChannel = mergedChannel;
          nextChannels = sortChannelsList(
            existingSource.channels.map((item, idx) =>
              idx === channelIndex ? mergedChannel : item,
            ),
          );
        }

        const nextSource: LogSource = {
          ...existingSource,
          channels: nextChannels,
        };

        const next = [...prev];
        next[index] = nextSource;
        return sortSourcesList(next);
      });

      return finalChannel;
    },
    [],
  );

  const removeChannel = useCallback(
    (sourceId: string, channelId: string) => {
      const canonicalSourceId = slugify(sourceId) || sourceId;
      const canonicalChannelId = slugify(channelId) || channelId;
      let removed = false;

      setSources((prev) => {
        const index = prev.findIndex((item) => item.id === canonicalSourceId);
        if (index === -1) {
          return prev;
        }
        const target = prev[index];
        const channels = target.channels.filter(
          (channel) => channel.id !== canonicalChannelId,
        );
        if (channels.length === target.channels.length) {
          return prev;
        }
        removed = true;
        if (channels.length === 0) {
          const next = [...prev];
          next.splice(index, 1);
          return sortSourcesList(next);
        }
        const next = [...prev];
        next[index] = { ...target, channels: sortChannelsList(channels) };
        return sortSourcesList(next);
      });

      return removed;
    },
    [],
  );

  const unregisterSource = useCallback((sourceId: string) => {
    const canonicalSourceId = slugify(sourceId) || sourceId;
    let removed = false;

    setSources((prev) => {
      if (!prev.some((source) => source.id === canonicalSourceId)) {
        return prev;
      }
      removed = true;
      return prev.filter((source) => source.id !== canonicalSourceId);
    });

    return removed;
  }, []);

  const reset = useCallback(() => {
    setSources(sortSourcesList([...seedsRef.current]));
  }, []);

  const value = useMemo<SourceRegistryContextValue>(
    () => ({
      sources,
      registerSource,
      registerChannel,
      removeChannel,
      unregisterSource,
      reset,
    }),
    [sources, registerSource, registerChannel, removeChannel, unregisterSource, reset],
  );

  return (
    <SourceRegistryContext.Provider value={value}>
      {children}
    </SourceRegistryContext.Provider>
  );
};

export const useSourceRegistry = () => {
  const context = useContext(SourceRegistryContext);
  if (!context) {
    throw new Error('useSourceRegistry must be used within SourceRegistryProvider');
  }
  return context;
};

export default SourceRegistryProvider;
