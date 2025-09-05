import React, { useEffect, useState } from 'react';

interface FileEntry {
  name: string;
  // additional metadata can be stored but is not required for renaming
}

export interface BulkRenameProps {
  files: FileEntry[];
  /**
   * Mock filesystem represented as a map of filename to file entry.
   * The component will update this object when Apply is pressed.
   */
  mockFs: Record<string, FileEntry>;
  /**
   * Callback when renaming is applied.
   */
  onApply: (fs: Record<string, FileEntry>) => void;
}

interface PreviewEntry {
  old: string;
  newName: string;
  valid: boolean;
}

const INVALID_CHARS = /[\\/:*?"<>|]/;

function buildName(
  pattern: string,
  original: string,
  index: number,
  dateStr: string
): { base: string; ext: string; full: string } {
  const extIndex = original.lastIndexOf('.');
  const base = extIndex === -1 ? original : original.slice(0, extIndex);
  const ext = extIndex === -1 ? '' : original.slice(extIndex);
  const replaced = pattern
    .replace(/\{n\}/g, String(index + 1))
    .replace(/\{name\}/g, base)
    .replace(/\{date\}/g, dateStr);
  return { base: replaced, ext, full: replaced + ext };
}

export function generateRenames(
  files: FileEntry[],
  pattern: string,
  existing: Set<string>,
  dateStr: string = new Date().toISOString().split('T')[0]
): PreviewEntry[] {
  const renames: PreviewEntry[] = [];
  files.forEach((file, i) => {
    const { base, ext, full } = buildName(pattern, file.name, i, dateStr);
    let name = full;
    let valid = !!base && !INVALID_CHARS.test(base);
    if (valid) {
      let counter = 1;
      const baseFull = name.slice(0, name.length - ext.length);
      while (existing.has(name)) {
        name = `${baseFull} (${counter++})${ext}`;
      }
      existing.add(name);
    }
    renames.push({ old: file.name, newName: name, valid });
  });
  return renames;
}

export function applyRenames(
  files: FileEntry[],
  pattern: string,
  mockFs: Record<string, FileEntry>
): { updatedFs: Record<string, FileEntry>; renames: PreviewEntry[] } {
  const existing = new Set(
    Object.keys(mockFs).filter((n) => !files.some((f) => f.name === n))
  );
  const renames = generateRenames(files, pattern, existing);
  const updatedFs: Record<string, FileEntry> = { ...mockFs };
  renames.forEach(({ old, newName, valid }) => {
    if (!valid) return;
    const entry = updatedFs[old];
    delete updatedFs[old];
    updatedFs[newName] = entry;
  });
  return { updatedFs, renames };
}

const BulkRename: React.FC<BulkRenameProps> = ({ files, mockFs, onApply }) => {
  const [pattern, setPattern] = useState('{name}');
  const [preview, setPreview] = useState<PreviewEntry[]>([]);
  const dateStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const existing = new Set(
      Object.keys(mockFs).filter((n) => !files.some((f) => f.name === n))
    );
    setPreview(generateRenames(files, pattern, existing, dateStr));
  }, [files, pattern, mockFs, dateStr]);

  const hasInvalid = preview.some((p) => !p.valid);

  const handleApply = () => {
    if (hasInvalid) return;
    const { updatedFs } = applyRenames(files, pattern, mockFs);
    onApply(updatedFs);
  };

  return (
    <div className="p-4 space-y-4">
      <input
        className="border p-2 w-full"
        aria-label="Rename pattern"
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        placeholder="Pattern e.g. image_{n}"
      />
      <ul className="max-h-60 overflow-y-auto space-y-1">
        {preview.map(({ old, newName, valid }) => (
          <li key={old} className={valid ? '' : 'text-red-500'}>
            {old} ➜ {newName}
          </li>
        ))}
      </ul>
      {hasInvalid && (
        <div className="text-red-500">Invalid file names detected</div>
      )}
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        onClick={handleApply}
        disabled={hasInvalid}
      >
        Apply
      </button>
    </div>
  );
};

export default BulkRename;

