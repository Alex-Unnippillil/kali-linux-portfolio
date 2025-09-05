import { useState } from 'react';
import JSZip from 'jszip';

export default function XArchiverPage() {
  const [entries, setEntries] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleArchiveOpen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(data);
      const names = Object.keys(zip.files);
      setEntries(names);
    } catch (err) {
      console.error('Failed to read archive', err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 0) return;
    setIsCompressing(true);
    setProgress(0);
    let value = 0;
    const timer = setInterval(() => {
      value += 10;
      setProgress(value);
      if (value >= 100) {
        clearInterval(timer);
        setIsCompressing(false);
        setEntries((prev) => [...prev, ...dropped.map((f) => f.name)]);
        setProgress(0);
      }
    }, 200);
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">XArchiver</h1>
      <input
        type="file"
        accept=".zip"
        onChange={handleArchiveOpen}
        className="mb-4"
        aria-label="Open archive"
      />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="mb-4 flex h-48 flex-col items-center justify-center rounded border-2 border-dashed p-4"
      >
        {isCompressing ? (
          <div className="w-full">
            <p className="mb-2 text-center">Adding files...</p>
            <div className="h-4 w-full rounded bg-gray-200">
              <div
                className="h-full rounded bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-center">Drag files here to add to archive</p>
        )}
      </div>
      {entries.length > 0 && (
        <ul className="list-disc pl-5">
          {entries.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

