'use client';

import React, { useMemo } from 'react';

export type PreviewTab = 'hex' | 'text' | 'image';

export interface FilePreviewData {
  id: string;
  name: string;
  size: number;
  type: string;
  hex: string;
  strings: string;
  hash: string;
  known?: string | null;
  imageUrl: string | null;
  availableTabs: PreviewTab[];
}

interface FilePreviewProps {
  file: FilePreviewData;
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const SUPPORTED_IMAGE_TYPES = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
] as const;

const TAB_LABELS: Record<PreviewTab, string> = {
  hex: 'Hex',
  text: 'Text',
  image: 'Image',
};

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes === 0) {
    return '0 B';
  }

  const sign = bytes < 0 ? '-' : '';
  const absolute = Math.abs(bytes);
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const exponent = Math.min(
    Math.floor(Math.log(absolute) / Math.log(1024)),
    units.length - 1
  );
  const value = absolute / Math.pow(1024, exponent);

  return `${sign}${value.toFixed(value >= 10 ? 0 : 2)} ${units[exponent]}`;
};

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  activeTab,
  onTabChange,
  isOpen,
  onToggle,
}) => {
  const metadata = useMemo(
    () => [
      { label: 'Type', value: file.type || 'Unknown' },
      { label: 'Size', value: formatBytes(file.size) },
      { label: 'SHA-256', value: file.hash || 'Unavailable' },
      { label: 'Known', value: file.known ?? 'Unknown' },
    ],
    [file.hash, file.known, file.size, file.type]
  );

  const availableTabs = useMemo(
    () => file.availableTabs.filter((tab) => (tab === 'image' ? !!file.imageUrl : true)),
    [file.availableTabs, file.imageUrl]
  );

  const previewContent = useMemo(() => {
    if (activeTab === 'image') {
      if (!file.imageUrl) {
        return (
          <p className="text-[0.7rem] text-gray-300">
            No image preview is available for this file.
          </p>
        );
      }
      return (
        <img
          src={file.imageUrl}
          alt={`${file.name} preview`}
          className="max-w-full h-auto rounded"
        />
      );
    }

    const text = activeTab === 'hex' ? file.hex : file.strings;

    if (!text) {
      return (
        <p className="text-[0.7rem] text-gray-300">
          No {TAB_LABELS[activeTab].toLowerCase()} data could be extracted.
        </p>
      );
    }

    return (
      <pre className="font-mono whitespace-pre-wrap break-all text-[0.65rem] leading-relaxed">
        {text}
      </pre>
    );
  }, [activeTab, file.hex, file.imageUrl, file.name, file.strings]);

  return (
    <aside className="flex-grow bg-ub-grey p-3 rounded text-xs flex flex-col border border-white/10">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-sm break-words">{file.name}</div>
          <div className="text-[0.65rem] text-gray-300 uppercase tracking-wide">
            {file.type || 'Unknown'} · {formatBytes(file.size)}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={isOpen}
          className="text-ub-orange text-[0.7rem] underline"
        >
          {isOpen ? 'Hide preview' : 'Show preview'}
        </button>
      </div>
      {isOpen ? (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.65rem] text-gray-200 mb-3">
            {metadata.map((item) => (
              <div key={item.label}>
                <dt className="uppercase tracking-wide text-gray-400">
                  {item.label}
                </dt>
                <dd className="text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
          {availableTabs.length > 0 && (
            <div className="flex space-x-2 mb-2">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onTabChange(tab)}
                  className={`px-2 py-1 rounded ${
                    activeTab === tab
                      ? 'bg-ub-orange text-black'
                      : 'bg-ub-cool-grey text-white'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto bg-black/30 border border-white/10 rounded p-2">
            {previewContent}
          </div>
          <p className="text-[0.6rem] text-gray-300 mt-3">
            Supported previews: Text (UTF-8) and images (
            {SUPPORTED_IMAGE_TYPES.map((type) => type.toUpperCase()).join(', ')}).
            Press Space to toggle the preview without leaving the keyboard.
          </p>
        </>
      ) : (
        <p className="text-[0.7rem] text-gray-300">
          Preview hidden. Press Space or use the button above to reopen it.
        </p>
      )}
    </aside>
  );
};

export default FilePreview;

