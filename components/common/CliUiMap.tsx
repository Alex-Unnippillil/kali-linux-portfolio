import React, { useEffect, useMemo, useState } from 'react';

interface CliRow {
  label: string;
  flag?: string;
  value?: React.ReactNode;
  hint?: React.ReactNode;
}

interface CliSection {
  title: string;
  rows: CliRow[];
}

export interface CliToolConfig {
  id: string;
  label: string;
  command: string;
  description?: React.ReactNode;
  sections?: CliSection[];
}

interface CliUiMapProps {
  tools: CliToolConfig[];
  initialToolId?: string;
  onCopy?: (toolId: string) => void;
}

const useRafValue = <T,>(value: T) => {
  const [state, setState] = useState(value);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      setState(value);
      return;
    }

    const frame = window.requestAnimationFrame(() => setState(value));
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return state;
};

const formatValue = (value?: React.ReactNode) => {
  if (value === undefined || value === null || value === '') {
    return <span className="text-gray-400">Not set</span>;
  }
  return value;
};

const CliUiMap: React.FC<CliUiMapProps> = ({ tools, initialToolId, onCopy }) => {
  const [activeToolId, setActiveToolId] = useState(() => initialToolId ?? tools[0]?.id ?? '');
  const activeTool = useMemo(
    () => tools.find((tool) => tool.id === activeToolId) ?? tools[0],
    [activeToolId, tools]
  );
  const [copiedTool, setCopiedTool] = useState<string | null>(null);
  const debouncedCommand = useRafValue(activeTool?.command ?? '');

  useEffect(() => {
    if (!activeTool) {
      const fallback = tools[0]?.id ?? '';
      setActiveToolId(fallback);
    }
  }, [activeTool, tools]);

  useEffect(() => {
    if (!copiedTool) return;
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => setCopiedTool(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedTool]);

  if (!activeTool) {
    return null;
  }

  const handleCopy = async () => {
    if (!activeTool?.command) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeTool.command);
        setCopiedTool(activeTool.id);
        onCopy?.(activeTool.id);
      }
    } catch (error) {
      // no-op; clipboard might be unavailable in some environments
    }
  };

  return (
    <div className="bg-black/60 border border-gray-700 rounded-md p-4 text-sm space-y-4">
      {tools.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="CLI tools">
          {tools.map((tool) => {
            const isActive = tool.id === activeTool.id;
            return (
              <button
                key={tool.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveToolId(tool.id)}
                className={`px-3 py-1 rounded-full border ${
                  isActive
                    ? 'bg-ub-yellow text-black border-ub-yellow'
                    : 'bg-gray-800 text-gray-200 border-gray-700 hover:border-ub-yellow'
                }`}
              >
                {tool.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <pre
          className="flex-1 bg-black text-green-400 p-3 rounded-md overflow-x-auto text-xs sm:text-sm"
          data-testid={`${activeTool.id}-cli-command`}
        >
          {debouncedCommand || 'Command preview will appear here'}
        </pre>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded bg-ub-grey text-black font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
          >
            Copy CLI command
          </button>
          <span
            role="status"
            aria-live="polite"
            className={`text-xs ${
              copiedTool === activeTool.id ? 'text-green-300' : 'text-transparent'
            }`}
          >
            Command copied
          </span>
        </div>
      </div>

      {activeTool.description && (
        <p className="text-xs text-gray-300">{activeTool.description}</p>
      )}

      {activeTool.sections?.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-gray-400">
            {section.title}
          </h3>
          <dl className="space-y-2">
            {section.rows.map((row) => (
              <div
                key={`${section.title}-${row.label}`}
                className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-start"
              >
                <dt className="sm:col-span-2 text-gray-200">{row.label}</dt>
                <dd className="sm:col-span-1 text-gray-400">
                  {row.flag ? <code>{row.flag}</code> : <span className="text-gray-500">—</span>}
                </dd>
                <dd className="sm:col-span-3 text-gray-100">
                  {formatValue(row.value)}
                  {row.hint && (
                    <div className="text-xs text-gray-400 mt-1">{row.hint}</div>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

export default CliUiMap;
