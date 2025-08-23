import React, { useState } from 'react';

interface MagicNumber {
  type: string;
  bytes: number[];
  offset: number;
}

const MAGIC_NUMBERS: MagicNumber[] = [
  { type: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  { type: 'JPEG', bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { type: 'GIF87a', bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0 },
  { type: 'GIF89a', bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0 },
  { type: 'PDF', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], offset: 0 },
  { type: 'ZIP', bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0 },
  { type: 'RAR', bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00], offset: 0 },
  { type: 'GZIP', bytes: [0x1f, 0x8b, 0x08], offset: 0 },
  { type: 'ELF', bytes: [0x7f, 0x45, 0x4c, 0x46], offset: 0 },
];

const FileSignature: React.FC = () => {
  const [fileType, setFileType] = useState<string | null>(null);
  const [preview, setPreview] = useState<number[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      const bytes = Array.from(new Uint8Array(buffer));
      setPreview(bytes.slice(0, 64));
      const match = MAGIC_NUMBERS.find((m) =>
        m.bytes.every((b, i) => bytes[m.offset + i] === b)
      );
      setFileType(match ? match.type : 'Unknown');
    };
    reader.readAsArrayBuffer(file.slice(0, 64));
  };

  return (
    <div className="w-full h-full flex flex-col bg-panel text-white p-2 text-sm">
      <input type="file" onChange={handleFile} className="mb-2" />
      {fileType && <div className="mb-2">Type: {fileType}</div>}
      {preview.length > 0 && (
        <pre className="bg-black bg-opacity-50 p-2 rounded overflow-auto flex-grow font-mono text-xs">
          {preview
            .map((b, i) => `${i.toString().padStart(4, '0')}: ${b
              .toString(16)
              .padStart(2, '0')}`)
            .join('\n')}
        </pre>
      )}
    </div>
  );
};

export default FileSignature;

export const displayFileSignature = () => {
  return <FileSignature />;
};

