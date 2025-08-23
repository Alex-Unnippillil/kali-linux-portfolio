import React, { useState, useCallback } from 'react';

function murmurhash3_32_gc(key: string, seed = 0): string {
  let remainder = key.length & 3;
  const bytes = key.length - remainder;
  let h1 = seed;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let i = 0;
  let k1 = 0;

  while (i < bytes) {
    k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = (k1 * c1) | 0;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = (k1 * c2) | 0;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (h1 * 5 + 0xe6546b64) | 0;
  }

  k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = (k1 * c1) | 0;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (k1 * c2) | 0;
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = (h1 * 0x85ebca6b) | 0;
  h1 ^= h1 >>> 13;
  h1 = (h1 * 0xc2b2ae35) | 0;
  h1 ^= h1 >>> 16;

  return (h1 >>> 0).toString();
}

const MAX_SIZE = 100 * 1024; // 100KB

const FaviconHash: React.FC = () => {
  const [murmur, setMurmur] = useState('');
  const [sha1, setSha1] = useState('');
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState('');

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError('');
    setMurmur('');
    setSha1('');

    const sizeKB = (file.size / 1024).toFixed(1);
    setFileInfo(`${file.name} - ${sizeKB} KB`);
    if (file.size > MAX_SIZE) {
      setError(`File too large. Max ${(MAX_SIZE / 1024).toFixed(0)} KB`);
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const m = murmurhash3_32_gc(base64);
    const shaBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
    const shaArray = Array.from(new Uint8Array(shaBuffer));
    const s = shaArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    setMurmur(m);
    setSha1(s);
  }, []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const copy = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
  }, []);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col items-center space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full max-w-md flex flex-col items-center justify-center border-2 border-dashed border-gray-500 rounded p-8 cursor-pointer"
      >
        <input
          id="favicon-input"
          type="file"
          accept="image/x-icon,image/png,image/svg+xml"
          className="hidden"
          onChange={onChange}
        />
        <label htmlFor="favicon-input" className="text-center">
          Drag & drop a favicon here, or click to select.
        </label>
      </div>
      {fileInfo && <div>{fileInfo}</div>}
      {error && <div className="text-red-400">{error}</div>}
      {murmur && sha1 && (
        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Murmur:</span>
            <span className="flex-1 break-all">{murmur}</span>
            <button
              type="button"
              onClick={() => copy(murmur)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold">SHA-1:</span>
            <span className="flex-1 break-all">{sha1}</span>
            <button
              type="button"
              onClick={() => copy(sha1)}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
          <div className="text-sm text-yellow-400">
            Hashes can identify browsers and sites. Share responsibly to protect privacy.
          </div>
        </div>
      )}
    </div>
  );
};

export default FaviconHash;

