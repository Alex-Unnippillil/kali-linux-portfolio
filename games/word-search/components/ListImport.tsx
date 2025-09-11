import React, { useRef } from 'react';

interface ListImportProps {
  onImport: (words: string[]) => void;
}

const ListImport: React.FC<ListImportProps> = ({ onImport }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const words = text
        .split(/[\s,]+/)
        .map((w) => w.trim().toUpperCase())
        .filter((w) => w && /^[A-Z]+$/.test(w));
      if (words.length) {
        onImport(words);
      }
    } catch {
      // ignore read errors
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="px-2 py-1 bg-purple-700 text-white rounded"
      >
        Import List
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
};

export default ListImport;
