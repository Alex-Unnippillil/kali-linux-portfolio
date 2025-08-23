import React, { useState, ChangeEvent } from 'react';
import JSZip from 'jszip';

interface Entry {
  file: File;
  note: string;
}

const EvidenceNotebook: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEntries((prev) => [...prev, ...files.map((file) => ({ file, note: '' }))]);
  };

  const onNoteChange = (index: number, note: string) => {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, note } : entry)));
  };

  const hashFile = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const exportZip = async () => {
    const zip = new JSZip();
    const manifest: { files: { name: string; hash: string; note: string }[] } = { files: [] };

    for (const entry of entries) {
      const arrayBuffer = await entry.file.arrayBuffer();
      zip.file(entry.file.name, arrayBuffer);
      const hash = await hashFile(entry.file);
      manifest.files.push({ name: entry.file.name, hash, note: entry.note });
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evidence.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-panel text-white p-4 space-y-4 overflow-hidden">
      <input type="file" multiple onChange={onFileChange} />
      <div className="flex-1 overflow-auto">
        {entries.map((entry, idx) => (
          <div key={idx} className="mb-4">
            <div className="mb-1">{entry.file.name}</div>
            <textarea
              className="w-full p-1 text-black"
              placeholder="Notes"
              value={entry.note}
              onChange={(e) => onNoteChange(idx, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded disabled:opacity-50"
        onClick={exportZip}
        disabled={entries.length === 0}
      >
        Export
      </button>
    </div>
  );
};

export default EvidenceNotebook;

export const displayEvidenceNotebook = () => <EvidenceNotebook />;
