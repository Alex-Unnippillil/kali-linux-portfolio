'use client';

import {
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useState,
  type SVGProps,
} from 'react';
import SourceRegistryProvider, {
  LogChannel,
  LogField,
  LogLevelMap,
  LogSource,
  slugify,
  useSourceRegistry,
} from '../../components/apps/log-console/SourceRegistry';

const DEFAULT_FIELD_TEMPLATE = 'timestamp:Timestamp:datetime\nmessage:Message:text';
const DEFAULT_LEVEL_TEMPLATE =
  'info:Info:#2563EB:20\nwarning:Warning:#D97706:30\nerror:Error:#DC2626:40';

interface ChannelDraft {
  uid: string;
  name: string;
  description: string;
  fields: string;
  levels: string;
}

const ChannelIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={1.5}
    {...props}
  >
    <rect x={4} y={4} width={16} height={4} rx={1} />
    <rect x={4} y={10} width={16} height={4} rx={1} />
    <rect x={4} y={16} width={16} height={4} rx={1} />
  </svg>
);

const createDraftId = () => Math.random().toString(36).slice(2, 10);

const createChannelDraft = (): ChannelDraft => ({
  uid: createDraftId(),
  name: '',
  description: '',
  fields: DEFAULT_FIELD_TEMPLATE,
  levels: DEFAULT_LEVEL_TEMPLATE,
});

const toTitleCase = (value: string) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const parseFields = (raw: string): LogField[] => {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [
      { key: 'timestamp', label: 'Timestamp', type: 'datetime' },
      { key: 'message', label: 'Message', type: 'text' },
    ];
  }

  return lines.map((line, index) => {
    const [keyPart, labelPart, typePart] = line.split(':').map((part) => part.trim());
    const key = keyPart || `field-${index + 1}`;
    const label = labelPart || toTitleCase(key);
    const type = typePart || 'string';
    return { key, label, type };
  });
};

const parseLevels = (raw: string): LogLevelMap => {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      info: { label: 'Info', color: '#2563EB', severity: 20 },
      warning: { label: 'Warning', color: '#D97706', severity: 30 },
      error: { label: 'Error', color: '#DC2626', severity: 40 },
    };
  }

  const entries = lines.map((line, index) => {
    const [idPart, labelPart, colorPart, severityPart] = line
      .split(':')
      .map((part) => part.trim());
    const key = idPart || `level-${index + 1}`;
    const label = labelPart || toTitleCase(key);
    const color = colorPart || '#2563EB';
    const severityValue = Number(severityPart);
    const severity = Number.isFinite(severityValue)
      ? severityValue
      : (index + 1) * 10;
    return [
      (key || label).toLowerCase().replace(/\s+/g, '-'),
      { label, color, severity },
    ] as const;
  });

  return Object.fromEntries(entries);
};

const SourceSidebar = ({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) => {
  const { sources } = useSourceRegistry();

  return (
    <aside className="w-full md:w-64 md:max-w-xs border border-gray-800/80 bg-gray-900/40 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/80">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Sources
        </span>
        <span className="text-xs text-gray-500">{sources.length}</span>
      </div>
      <ul className="divide-y divide-gray-800/80">
        {sources.map((source) => {
          const isActive = source.id === selectedId;
          return (
            <li key={source.id}>
              <button
                type="button"
                onClick={() => onSelect(source.id)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Select ${source.name || source.id}`}
                className={`w-full text-left px-4 py-3 transition ${
                  isActive
                    ? 'bg-blue-600/20 text-white border-l-2 border-blue-500'
                    : 'hover:bg-gray-800/60 text-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{source.name}</p>
                    {source.description && (
                      <p className="text-xs text-gray-400 truncate">
                        {source.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border ${
                      isActive
                        ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                        : 'border-gray-700 bg-gray-800 text-gray-300'
                    }`}
                  >
                    <ChannelIcon className="w-3 h-3" aria-hidden="true" />
                    {source.channels.length}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
        {sources.length === 0 && (
          <li className="px-4 py-3 text-xs text-gray-400">
            No sources registered yet.
          </li>
        )}
      </ul>
    </aside>
  );
};

const ChannelCard = ({
  sourceId,
  channel,
  onRemoveChannel,
}: {
  sourceId: string;
  channel: LogChannel;
  onRemoveChannel: (sourceId: string, channelId: string) => void;
}) => {
  const levels = useMemo(
    () =>
      Object.entries(channel.levelMap ?? {})
        .map(([key, meta]) => [key, meta] as const)
        .sort((a, b) => a[1].severity - b[1].severity),
    [channel.levelMap],
  );

  return (
    <article className="rounded-lg border border-gray-800/80 bg-gray-900/40 p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{channel.name}</h3>
          {channel.description && (
            <p className="text-sm text-gray-400">{channel.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemoveChannel(sourceId, channel.id)}
          className="self-start text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800/70 transition"
        >
          Remove channel
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-xs uppercase tracking-widest text-gray-400">Fields</h4>
          <ul className="mt-2 space-y-2">
            {channel.fields.length > 0 ? (
              channel.fields.map((field) => (
                <li
                  key={field.key}
                  className="flex items-center justify-between rounded border border-gray-800/80 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{field.label}</p>
                    <p className="text-xs text-gray-400">{field.key}</p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-gray-200 bg-gray-800 px-2 py-0.5 rounded">
                    {field.type}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-xs text-gray-400">No schema fields defined.</li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest text-gray-400">Levels</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {levels.length > 0 ? (
              levels.map(([levelKey, meta]) => (
                <span
                  key={levelKey}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: meta.color }}
                >
                  <span>{meta.label}</span>
                  <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest">
                    {meta.severity}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400">No level metadata.</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const SourceDetails = ({
  source,
  onRemove,
  onRemoveChannel,
}: {
  source: LogSource | null;
  onRemove: (sourceId: string) => void;
  onRemoveChannel: (sourceId: string, channelId: string) => void;
}) => {
  if (!source) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 bg-gray-900/30 py-16 text-center">
        <p className="text-sm text-gray-300">Select a source to inspect its schema.</p>
        <p className="text-xs text-gray-500">
          Registered apps appear in the sidebar. Use the form above to seed demo data.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{source.name}</h2>
          {source.description && (
            <p className="text-sm text-gray-300">{source.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(source.id)}
          className="self-start text-sm px-3 py-1.5 rounded border border-red-500/80 text-red-200 hover:bg-red-500/10 transition"
        >
          Remove source
        </button>
      </header>
      <div className="space-y-4">
        {source.channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            sourceId={source.id}
            channel={channel}
            onRemoveChannel={onRemoveChannel}
          />
        ))}
        {source.channels.length === 0 && (
          <p className="text-sm text-gray-400">This source does not expose any channels.</p>
        )}
      </div>
    </section>
  );
};

const AddSourceForm = ({ onCreated }: { onCreated?: (id: string) => void }) => {
  const { registerSource, sources } = useSourceRegistry();
  const baseId = useId();
  const idPrefix = useMemo(() => {
    const sanitized = baseId.replace(/[^a-zA-Z0-9_-]/g, '');
    return sanitized ? `log-console-${sanitized}` : 'log-console';
  }, [baseId]);
  const sourceNameId = `${idPrefix}-name`;
  const sourceIdentifierId = `${idPrefix}-identifier`;
  const identifierHelpId = `${idPrefix}-identifier-help`;
  const descriptionId = `${idPrefix}-description`;
  const [name, setName] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [idDirty, setIdDirty] = useState(false);
  const [description, setDescription] = useState('');
  const [channels, setChannels] = useState<ChannelDraft[]>([
    createChannelDraft(),
  ]);
  const [message, setMessage] = useState<
    | { type: 'error' | 'success'; content: string }
    | null
  >(null);

  useEffect(() => {
    if (!idDirty) {
      setSourceId(slugify(name));
    }
  }, [name, idDirty]);

  const updateChannel = (uid: string, patch: Partial<ChannelDraft>) => {
    setChannels((prev) =>
      prev.map((channel) =>
        channel.uid === uid ? { ...channel, ...patch } : channel,
      ),
    );
  };

  const removeChannel = (uid: string) => {
    setChannels((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((channel) => channel.uid !== uid);
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage({ type: 'error', content: 'Enter a source name.' });
      return;
    }

    const canonicalId = slugify(sourceId || trimmedName);
    if (!canonicalId) {
      setMessage({
        type: 'error',
        content: 'Provide an identifier using lowercase letters, numbers, or dashes.',
      });
      return;
    }

    if (sources.some((source) => source.id === canonicalId)) {
      setMessage({
        type: 'error',
        content: 'A source with this identifier already exists.',
      });
      return;
    }

    const preparedChannels = channels
      .map((draft) => {
        const channelName = draft.name.trim();
        if (!channelName) {
          return null;
        }
        return {
          id: slugify(channelName),
          name: channelName,
          description: draft.description.trim() || undefined,
          fields: parseFields(draft.fields),
          levelMap: parseLevels(draft.levels),
        } as LogChannel;
      })
      .filter(Boolean) as LogChannel[];

    if (preparedChannels.length === 0) {
      setMessage({
        type: 'error',
        content: 'Add at least one channel with a name.',
      });
      return;
    }

    const created = registerSource({
      id: canonicalId,
      name: trimmedName,
      description: description.trim() || undefined,
      channels: preparedChannels,
    });

    setMessage({ type: 'success', content: `${created.name} registered.` });
    setName('');
    setSourceId('');
    setIdDirty(false);
    setDescription('');
    setChannels([createChannelDraft()]);

    onCreated?.(created.id);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-800/80 bg-gray-900/40 p-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-white">Register source</h2>
        <p className="text-xs text-gray-400">
          Provide metadata for mock apps so the console can render structured logs.
        </p>
      </div>
      {message && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            message.type === 'error'
              ? 'border-red-500/80 bg-red-500/10 text-red-200'
              : 'border-emerald-500/80 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          {message.content}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 text-sm text-gray-200">
          <label
            htmlFor={sourceNameId}
            className="text-xs uppercase tracking-wide text-gray-400"
          >
            Source name
          </label>
          <input
            id={sourceNameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Source name"
            className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Container Service"
          />
        </div>
        <div className="flex flex-col gap-1 text-sm text-gray-200">
          <label
            htmlFor={sourceIdentifierId}
            className="text-xs uppercase tracking-wide text-gray-400"
          >
            Identifier
          </label>
          <input
            id={sourceIdentifierId}
            value={sourceId}
            onChange={(event) => {
              setSourceId(event.target.value);
              setIdDirty(true);
            }}
            aria-describedby={identifierHelpId}
            aria-label="Source identifier"
            className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="auto-generated"
          />
          <span id={identifierHelpId} className="text-xs text-gray-500">
            Lowercase key used by the registry. Leave blank to auto-generate.
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm text-gray-200">
        <label
          htmlFor={descriptionId}
          className="text-xs uppercase tracking-wide text-gray-400"
        >
          Description
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          aria-label="Source description"
          className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Optional summary visible in the sidebar"
        />
      </div>
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Channels</h3>
          <button
            type="button"
            onClick={() => setChannels((prev) => [...prev, createChannelDraft()])}
            className="self-start rounded border border-blue-500/60 px-3 py-1 text-xs font-medium text-blue-200 hover:bg-blue-500/10 transition"
          >
            Add channel
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Define one channel per log stream. Fields use the format{' '}
          <code className="bg-gray-800/80 px-1 py-0.5 rounded">key:Label:Type</code> per
          line. Levels follow{' '}
          <code className="bg-gray-800/80 px-1 py-0.5 rounded">level:Label:#Color:Severity</code>.
        </p>
        {channels.map((channel, index) => {
          const channelIdPrefix = `${idPrefix}-channel-${channel.uid}`;
          const channelNameId = `${channelIdPrefix}-name`;
          const channelDescriptionId = `${channelIdPrefix}-description`;
          const channelFieldsId = `${channelIdPrefix}-fields`;
          const channelLevelsId = `${channelIdPrefix}-levels`;

          return (
            <div
              key={channel.uid}
              className="space-y-3 rounded-lg border border-gray-800/80 bg-gray-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Channel {index + 1}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Example: <code>syslog</code>, <code>audit</code>, or <code>pipeline</code>
                  </p>
                </div>
                {channels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChannel(channel.uid)}
                    className="text-xs text-red-300 hover:text-red-200"
                    aria-label={`Remove channel ${channel.name || index + 1}`}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1 text-sm text-gray-200">
                  <label
                    htmlFor={channelNameId}
                    className="text-xs uppercase tracking-wide text-gray-400"
                  >
                    Channel name
                  </label>
                  <input
                    id={channelNameId}
                    value={channel.name}
                    onChange={(event) =>
                      updateChannel(channel.uid, { name: event.target.value })
                    }
                    aria-label={`Channel ${index + 1} name`}
                    className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. syslog"
                  />
                </div>
                <div className="flex flex-col gap-1 text-sm text-gray-200">
                  <label
                    htmlFor={channelDescriptionId}
                    className="text-xs uppercase tracking-wide text-gray-400"
                  >
                    Description
                  </label>
                  <input
                    id={channelDescriptionId}
                    value={channel.description}
                    onChange={(event) =>
                      updateChannel(channel.uid, {
                        description: event.target.value,
                      })
                    }
                    aria-label={`Channel ${index + 1} description`}
                    className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Optional details"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 text-sm text-gray-200">
                <label
                  htmlFor={channelFieldsId}
                  className="text-xs uppercase tracking-wide text-gray-400"
                >
                  Fields
                </label>
                <textarea
                  id={channelFieldsId}
                  value={channel.fields}
                  onChange={(event) =>
                    updateChannel(channel.uid, { fields: event.target.value })
                  }
                  rows={3}
                  aria-label={`Channel ${index + 1} fields`}
                  className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1 text-sm text-gray-200">
                <label
                  htmlFor={channelLevelsId}
                  className="text-xs uppercase tracking-wide text-gray-400"
                >
                  Levels
                </label>
                <textarea
                  id={channelLevelsId}
                  value={channel.levels}
                  onChange={(event) =>
                    updateChannel(channel.uid, { levels: event.target.value })
                  }
                  rows={3}
                  aria-label={`Channel ${index + 1} levels`}
                  className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Register source
        </button>
      </div>
    </form>
  );
};

const RegistryShell = () => {
  const { sources, unregisterSource, removeChannel } = useSourceRegistry();
  const [selectedId, setSelectedId] = useState<string | null>(
    sources[0]?.id ?? null,
  );

  useEffect(() => {
    if (sources.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId) {
      setSelectedId(sources[0].id);
      return;
    }
    const exists = sources.some((source) => source.id === selectedId);
    if (!exists) {
      setSelectedId(sources[0].id);
    }
  }, [sources, selectedId]);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedId) ?? null,
    [sources, selectedId],
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-sm text-gray-100 md:flex-row md:gap-6">
      <div className="md:w-64 md:flex-shrink-0">
        <SourceSidebar selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
        <AddSourceForm onCreated={(id) => setSelectedId(id)} />
        <SourceDetails
          source={selectedSource}
          onRemove={(id) => unregisterSource(id)}
          onRemoveChannel={(sourceId, channelId) =>
            removeChannel(sourceId, channelId)
          }
        />
      </div>
    </div>
  );
};

const LogConsoleApp = () => {
  return (
    <SourceRegistryProvider>
      <RegistryShell />
    </SourceRegistryProvider>
  );
};

export default LogConsoleApp;
