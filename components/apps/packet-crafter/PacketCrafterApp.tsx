'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PACKET_TEMPLATES, DEFAULT_PACKET_TEMPLATE_ID } from './templates';
import type { LayerDiff, LayerDiffChange, PacketLayer, PacketLayerType, PacketTemplate } from './types';

const LAYER_TYPE_LABELS: Record<PacketLayerType, string> = {
  ethernet: 'Ethernet II',
  ipv4: 'IPv4',
  ipv6: 'IPv6',
  tcp: 'TCP',
  udp: 'UDP',
  icmp: 'ICMP',
  dns: 'DNS',
  http: 'HTTP',
};

interface LayerFieldMeta {
  key: string;
  label: string;
  helper?: string;
  placeholder?: string;
  input?: 'text' | 'textarea';
}

const LAYER_FIELD_METADATA: Partial<Record<PacketLayerType, LayerFieldMeta[]>> = {
  ethernet: [
    { key: 'srcMac', label: 'Source MAC', placeholder: 'de:ad:be:ef:12:34' },
    { key: 'dstMac', label: 'Destination MAC', placeholder: '00:15:5d:00:04:01' },
    { key: 'etherType', label: 'EtherType', helper: '0x0800 for IPv4, 0x86dd for IPv6' },
    { key: 'vlan', label: 'VLAN Tag', helper: 'Optional 802.1Q tag' },
  ],
  ipv4: [
    { key: 'version', label: 'Version' },
    { key: 'headerLength', label: 'Header Length', helper: 'Bytes used for the IPv4 header' },
    { key: 'tos', label: 'Type of Service' },
    { key: 'totalLength', label: 'Total Length', helper: 'Header + payload length' },
    { key: 'identification', label: 'Identification' },
    { key: 'flags', label: 'Flags' },
    { key: 'fragmentOffset', label: 'Fragment Offset' },
    { key: 'ttl', label: 'TTL' },
    { key: 'protocol', label: 'Protocol', helper: '6 for TCP, 17 for UDP, 1 for ICMP' },
    { key: 'headerChecksum', label: 'Header Checksum' },
    { key: 'srcIp', label: 'Source IP' },
    { key: 'dstIp', label: 'Destination IP' },
  ],
  ipv6: [
    { key: 'trafficClass', label: 'Traffic Class' },
    { key: 'flowLabel', label: 'Flow Label' },
    { key: 'payloadLength', label: 'Payload Length' },
    { key: 'nextHeader', label: 'Next Header' },
    { key: 'hopLimit', label: 'Hop Limit' },
    { key: 'srcIp', label: 'Source IPv6 Address' },
    { key: 'dstIp', label: 'Destination IPv6 Address' },
  ],
  tcp: [
    { key: 'srcPort', label: 'Source Port' },
    { key: 'dstPort', label: 'Destination Port' },
    { key: 'sequenceNumber', label: 'Sequence Number' },
    { key: 'acknowledgmentNumber', label: 'Acknowledgment Number' },
    { key: 'dataOffset', label: 'Data Offset' },
    { key: 'flags', label: 'Flags', helper: 'e.g. SYN, ACK, PSH' },
    { key: 'windowSize', label: 'Window Size' },
    { key: 'checksum', label: 'Checksum' },
    { key: 'urgentPointer', label: 'Urgent Pointer' },
    { key: 'options', label: 'Options', input: 'textarea' },
  ],
  udp: [
    { key: 'srcPort', label: 'Source Port' },
    { key: 'dstPort', label: 'Destination Port' },
    { key: 'length', label: 'Length' },
    { key: 'checksum', label: 'Checksum' },
  ],
  icmp: [
    { key: 'type', label: 'Type' },
    { key: 'code', label: 'Code' },
    { key: 'checksum', label: 'Checksum' },
    { key: 'identifier', label: 'Identifier' },
    { key: 'sequenceNumber', label: 'Sequence Number' },
    { key: 'payload', label: 'Payload', input: 'textarea' },
  ],
  dns: [
    { key: 'transactionId', label: 'Transaction ID' },
    { key: 'flags', label: 'Flags' },
    { key: 'questions', label: 'Questions' },
    { key: 'answers', label: 'Answers' },
    { key: 'authority', label: 'Authority Records' },
    { key: 'additional', label: 'Additional Records' },
    { key: 'queryName', label: 'Query Name' },
    { key: 'queryType', label: 'Query Type' },
    { key: 'queryClass', label: 'Query Class' },
    { key: 'recursionDesired', label: 'Recursion Desired' },
  ],
  http: [
    { key: 'method', label: 'Method' },
    { key: 'path', label: 'Path' },
    { key: 'host', label: 'Host' },
    { key: 'userAgent', label: 'User-Agent', input: 'textarea' },
    { key: 'accept', label: 'Accept', input: 'textarea' },
    { key: 'acceptLanguage', label: 'Accept-Language' },
    { key: 'additionalHeaders', label: 'Additional Headers', input: 'textarea' },
    { key: 'body', label: 'Body', input: 'textarea' },
  ],
};

const toTitle = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

const cloneTemplateLayers = (template: PacketTemplate): PacketLayer[] =>
  template.layers.map((layer) => ({
    type: layer.type,
    fields: { ...layer.fields },
  }));

const computeLayerDiffs = (template: PacketTemplate | null, currentLayers: PacketLayer[]): LayerDiff[] => {
  if (!template) return [];
  const diffs: LayerDiff[] = [];
  template.layers.forEach((templateLayer, index) => {
    const currentLayer = currentLayers[index];
    if (!currentLayer) return;
    const keys = new Set([
      ...Object.keys(templateLayer.fields),
      ...Object.keys(currentLayer.fields),
    ]);
    const changes: LayerDiffChange[] = [];
    keys.forEach((key) => {
      const templateValue = templateLayer.fields[key] ?? '';
      const currentValue = currentLayer.fields[key] ?? '';
      if (templateValue !== currentValue) {
        changes.push({ field: key, templateValue, currentValue });
      }
    });
    if (changes.length > 0) {
      diffs.push({ layerType: templateLayer.type, changes });
    }
  });
  return diffs;
};

interface TemplateGalleryProps {
  templates: PacketTemplate[];
  selectedId: string;
  onSelect: (templateId: string) => void;
  lastApplyDuration?: number | null;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  selectedId,
  onSelect,
  lastApplyDuration,
}) => (
  <section aria-label="Template presets" className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Templates</h2>
        <p className="text-sm text-gray-400">
          Choose a starting point to pre-fill each layer. Templates are applied in the next animation frame to keep the editor responsive.
        </p>
      </div>
      {typeof lastApplyDuration === 'number' && (
        <span className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-300" aria-live="polite">
          Last apply: {lastApplyDuration.toFixed(1)} ms
        </span>
      )}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => {
        const active = template.id === selectedId;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={`flex h-full flex-col gap-2 rounded-lg border p-4 text-left transition ${
              active
                ? 'border-blue-400 bg-gray-800 shadow-lg shadow-blue-900/30'
                : 'border-gray-700 bg-gray-800 hover:border-blue-500 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">{template.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  active ? 'bg-blue-500/20 text-blue-200' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {active ? 'Selected' : 'Apply'}
              </span>
            </div>
            <p className="flex-1 text-sm text-gray-300">{template.description}</p>
            <div className="flex flex-wrap gap-1 text-xs text-gray-400">
              {template.tags.map((tag) => (
                <span key={tag} className="rounded bg-gray-800 px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  </section>
);

interface LayerEditorProps {
  layers: PacketLayer[];
  template: PacketTemplate | null;
  onFieldChange: (layerIndex: number, field: string, value: string) => void;
  onLayerReset: (layerIndex: number) => void;
  onResetAll: () => void;
}

const LayerEditor: React.FC<LayerEditorProps> = ({
  layers,
  template,
  onFieldChange,
  onLayerReset,
  onResetAll,
}) => (
  <section aria-label="Packet layers" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-white">Layer editor</h2>
      <button
        type="button"
        onClick={onResetAll}
        className="rounded border border-blue-500 px-3 py-1 text-sm text-blue-200 transition hover:bg-blue-500/10 disabled:border-gray-600 disabled:text-gray-500"
        disabled={!template}
      >
        Reset to template
      </button>
    </div>
    {layers.map((layer, layerIndex) => {
      const fieldMeta = LAYER_FIELD_METADATA[layer.type] ?? [];
      const keys = Array.from(
        new Set([
          ...fieldMeta.map((meta) => meta.key),
          ...Object.keys(layer.fields),
        ]),
      );
      return (
        <div
          key={`${layer.type}-${layerIndex}`}
          className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">{LAYER_TYPE_LABELS[layer.type] ?? toTitle(layer.type)}</h3>
              <p className="text-xs text-gray-400">Edit the fields for the {LAYER_TYPE_LABELS[layer.type] ?? toTitle(layer.type)} layer.</p>
            </div>
            <button
              type="button"
              onClick={() => onLayerReset(layerIndex)}
              className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-300 transition hover:border-blue-500 hover:text-blue-200"
              disabled={!template}
            >
              Reset layer
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {keys.map((key) => {
              const meta = fieldMeta.find((item) => item.key === key);
              const label = meta?.label ?? toTitle(key);
              const helper = meta?.helper;
              const placeholder = meta?.placeholder;
              const inputType = meta?.input ?? (key.toLowerCase().includes('payload') || key.toLowerCase().includes('body') ? 'textarea' : 'text');
              const value = layer.fields[key] ?? '';
              const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
              const fieldId = `packet-layer-${layerIndex}-${sanitizedKey}`;
              return (
                <div key={key} className="flex flex-col gap-1 text-sm text-gray-200">
                  <label htmlFor={fieldId} className="font-medium text-white">
                    {label}
                  </label>
                  {inputType === 'textarea' ? (
                    <textarea
                      id={fieldId}
                      aria-label={label}
                      value={value}
                      placeholder={placeholder}
                      onChange={(event) => onFieldChange(layerIndex, key, event.target.value)}
                      className="min-h-[70px] rounded border border-gray-700 bg-gray-900 p-2 font-mono text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <input
                      id={fieldId}
                      type="text"
                      aria-label={label}
                      value={value}
                      placeholder={placeholder}
                      onChange={(event) => onFieldChange(layerIndex, key, event.target.value)}
                      className="rounded border border-gray-700 bg-gray-900 p-2 font-mono text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
                    />
                  )}
                  {helper && <span className="text-xs text-gray-400">{helper}</span>}
                </div>
              );
            })}
          </div>
        </div>
      );
    })}
  </section>
);

interface DiffViewerProps {
  template: PacketTemplate | null;
  layers: PacketLayer[];
}

const DiffViewer: React.FC<DiffViewerProps> = ({ template, layers }) => {
  const diffs = useMemo(() => computeLayerDiffs(template, layers), [template, layers]);
  const totalChanges = diffs.reduce((acc, diff) => acc + diff.changes.length, 0);

  return (
    <section
      aria-label="Quick compare"
      className="flex h-full flex-col gap-3 rounded-lg border border-gray-700 bg-gray-800 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Quick compare</h2>
          <p className="text-sm text-gray-400">
            Review how the current packet differs from the selected template defaults.
          </p>
        </div>
        <span className="rounded bg-gray-800 px-3 py-1 text-xs text-gray-300" aria-live="polite">
          {totalChanges === 0 ? 'No differences' : `${totalChanges} field${totalChanges === 1 ? '' : 's'} changed`}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        {template ? (
          diffs.length === 0 ? (
            <p className="text-sm text-gray-300">
              Your packet currently matches the template defaults. Adjust any field to see the diff update instantly.
            </p>
          ) : (
            <ul className="space-y-3">
              {diffs.map((layerDiff) => (
                <li key={layerDiff.layerType} className="space-y-2 rounded border border-gray-700 bg-gray-900 p-3">
                  <h3 className="text-sm font-semibold text-white">
                    {LAYER_TYPE_LABELS[layerDiff.layerType] ?? toTitle(layerDiff.layerType)}
                  </h3>
                  <ul className="space-y-2 text-xs text-gray-200">
                    {layerDiff.changes.map((change) => (
                      <li key={`${layerDiff.layerType}-${change.field}`} className="space-y-1">
                        <div className="font-semibold text-gray-100">{toTitle(change.field)}</div>
                        <div className="grid gap-1 sm:grid-cols-2">
                          <div className="rounded border border-red-700/60 bg-red-900/20 p-2">
                            <div className="text-[10px] uppercase tracking-wide text-red-300">Current</div>
                            <div className="font-mono text-xs text-red-100 break-words">{change.currentValue || '⟂ empty'}</div>
                          </div>
                          <div className="rounded border border-emerald-700/60 bg-emerald-900/20 p-2">
                            <div className="text-[10px] uppercase tracking-wide text-emerald-300">Template</div>
                            <div className="font-mono text-xs text-emerald-100 break-words">{change.templateValue || '⟂ empty'}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-gray-300">Select a template to compare against its defaults.</p>
        )}
      </div>
    </section>
  );
};

const PacketCrafterApp: React.FC = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_PACKET_TEMPLATE_ID);
  const [layers, setLayers] = useState<PacketLayer[]>(() => {
    const initialTemplate = PACKET_TEMPLATES.find((template) => template.id === DEFAULT_PACKET_TEMPLATE_ID);
    return initialTemplate ? cloneTemplateLayers(initialTemplate) : [];
  });
  const [lastApplyDuration, setLastApplyDuration] = useState<number | null>(null);
  const applyRaf = useRef<number | null>(null);

  const selectedTemplate = useMemo(
    () => PACKET_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId],
  );

  const applyTemplate = useCallback((template: PacketTemplate) => {
    setSelectedTemplateId(template.id);
    const nextLayers = cloneTemplateLayers(template);
    const hasPerformance = typeof performance !== 'undefined';
    const start = hasPerformance ? performance.now() : null;
    const commit = () => {
      setLayers(nextLayers);
      if (hasPerformance && start !== null) {
        const duration = performance.now() - start;
        setLastApplyDuration(duration);
      } else {
        setLastApplyDuration(null);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      if (applyRaf.current !== null) {
        window.cancelAnimationFrame(applyRaf.current);
      }
      applyRaf.current = window.requestAnimationFrame(() => {
        commit();
        applyRaf.current = null;
      });
    } else {
      commit();
    }
  }, []);

  useEffect(() => () => {
    if (applyRaf.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(applyRaf.current);
    }
  }, []);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const template = PACKET_TEMPLATES.find((item) => item.id === templateId);
      if (template) {
        applyTemplate(template);
      }
    },
    [applyTemplate],
  );

  const handleFieldChange = useCallback((layerIndex: number, field: string, value: string) => {
    setLayers((previousLayers) =>
      previousLayers.map((layer, index) => {
        if (index !== layerIndex) return layer;
        return {
          ...layer,
          fields: {
            ...layer.fields,
            [field]: value,
          },
        };
      }),
    );
  }, []);

  const handleLayerReset = useCallback(() => {
    if (!selectedTemplate) return;
    applyTemplate(selectedTemplate);
  }, [applyTemplate, selectedTemplate]);

  const handleSingleLayerReset = useCallback(
    (layerIndex: number) => {
      if (!selectedTemplate) return;
      const templateLayer = selectedTemplate.layers[layerIndex];
      if (!templateLayer) return;
      setLayers((previousLayers) =>
        previousLayers.map((layer, index) => {
          if (index !== layerIndex) return layer;
          return {
            type: templateLayer.type,
            fields: { ...templateLayer.fields },
          };
        }),
      );
    },
    [selectedTemplate],
  );

  const packetPreview = useMemo(() => JSON.stringify({ layers }, null, 2), [layers]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto bg-gray-900 p-5 text-gray-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Packet Crafter</h1>
        <p className="text-sm text-gray-300">
          Experiment with layered packet templates. Adjust headers, compare against defaults, and export the staged structure for learning or demos. No packets leave this environment.
        </p>
      </header>

      <TemplateGallery
        templates={PACKET_TEMPLATES}
        selectedId={selectedTemplateId}
        onSelect={handleTemplateSelect}
        lastApplyDuration={lastApplyDuration}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <LayerEditor
          layers={layers}
          template={selectedTemplate}
          onFieldChange={handleFieldChange}
          onLayerReset={handleSingleLayerReset}
          onResetAll={handleLayerReset}
        />
        <DiffViewer template={selectedTemplate} layers={layers} />
      </div>

      <section className="space-y-2 rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Packet JSON preview</h2>
          <span className="text-xs text-gray-400">Use this structure to share or persist crafted packets.</span>
        </div>
        <pre className="max-h-64 overflow-auto rounded bg-gray-900 p-4 text-xs text-emerald-200 shadow-inner">
          {packetPreview}
        </pre>
      </section>
    </div>
  );
};

export default PacketCrafterApp;
