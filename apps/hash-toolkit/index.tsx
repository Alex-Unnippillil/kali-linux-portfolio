import React, { useEffect, useRef, useState } from 'react';
import CryptoJS from 'crypto-js';
import ssdeep from 'ssdeep.js';

interface Hashes {
  md5: string;
  sha1: string;
  sha256: string;
  ssdeep: string;
}

const emptyHashes: Hashes = {
  md5: '',
  sha1: '',
  sha256: '',
  ssdeep: '',
};

const HashToolkit: React.FC = () => {
  const [text, setText] = useState('');
  const [hashes, setHashes] = useState<Hashes>(emptyHashes);
  const [error, setError] = useState('');
  const workerRef = useRef<Worker>();

  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(new URL('./hashWorker.ts', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const data = e.data as Partial<Hashes> & { error?: string };
        if (data.error) setError(data.error);
        else setHashes({ ...emptyHashes, ...data } as Hashes);
      };
    }
    return () => workerRef.current?.terminate();
  }, []);

  const computeText = (value: string) => {
    const wordArray = CryptoJS.enc.Utf8.parse(value);
    const md5 = CryptoJS.MD5(wordArray);
    const sha1 = CryptoJS.SHA1(wordArray);
    const sha256 = CryptoJS.SHA256(wordArray);
    const fuzzy = ssdeep.digest(value);
    setHashes({
      md5: md5.toString(),
      sha1: sha1.toString(),
      sha256: sha256.toString(),
      ssdeep: fuzzy,
    });
  };

  const computeBuffer = (buffer: ArrayBuffer) => {
    const wordArray = CryptoJS.lib.WordArray.create(buffer);
    const md5 = CryptoJS.MD5(wordArray);
    const sha1 = CryptoJS.SHA1(wordArray);
    const sha256 = CryptoJS.SHA256(wordArray);
    const fuzzy = ssdeep.digest(new Uint8Array(buffer));
    setHashes({
      md5: md5.toString(),
      sha1: sha1.toString(),
      sha256: sha256.toString(),
      ssdeep: fuzzy,
    });
  };

  const handleText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    setError('');
    if (!value) {
      setHashes(emptyHashes);
      return;
    }
    computeText(value);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (workerRef.current) {
      workerRef.current.postMessage(file);
    } else {
      try {
        let buffer: ArrayBuffer;
        if (typeof (file as any).arrayBuffer === 'function') {
          buffer = await (file as any).arrayBuffer();
        } else {
          buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
          });
        }
        computeBuffer(buffer);
      } catch {
        setError('File read error');
      }
    }
  };

  const copy = (value: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {});
  };

  const hashEntries = [
    { label: 'MD5', key: 'md5' },
    { label: 'SHA-1', key: 'sha1' },
    { label: 'SHA-256', key: 'sha256' },
    { label: 'ssdeep', key: 'ssdeep' },
  ] as const;

  // Image perceptual hash state
  const [imgA, setImgA] = useState('');
  const [imgB, setImgB] = useState('');
  const [imgErr, setImgErr] = useState('');
  const [distance, setDistance] = useState<number | null>(null);

  const imageHash = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 8;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unsupported'));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const gray: number[] = [];
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          gray.push(v);
          sum += v;
        }
        const avg = sum / 64;
        let hash = 0n;
        for (let i = 0; i < 64; i += 1) {
          if (gray[i] >= avg) hash |= 1n << BigInt(63 - i);
        }
        URL.revokeObjectURL(url);
        resolve(hash.toString(16).padStart(16, '0'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load error'));
      };
      img.src = url;
    });
  };

  const hammingDistance = (a: string, b: string) => {
    let x = BigInt('0x' + a) ^ BigInt('0x' + b);
    let dist = 0;
    while (x !== 0n) {
      dist += 1;
      x &= x - 1n;
    }
    return dist;
  };

  useEffect(() => {
    if (imgA && imgB) setDistance(hammingDistance(imgA, imgB));
    else setDistance(null);
  }, [imgA, imgB]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>, which: 'a' | 'b') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImgErr('Unsupported image type');
      return;
    }
    try {
      const hash = await imageHash(file);
      if (which === 'a') setImgA(hash);
      else setImgB(hash);
      setImgErr('');
    } catch {
      setImgErr('Unreadable image');
    }
  };

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-gray-900 text-white">
      <div className="mb-4">
        <textarea
          data-testid="text-input"
          value={text}
          onChange={handleText}
          className="w-full h-32 p-2 rounded text-black"
          placeholder="Enter text"
        />
      </div>
      <div className="mb-4">
        <input
          data-testid="file-input"
          type="file"
          onChange={handleFile}
          className="mb-2"
        />
        {error && (
          <div role="alert" className="text-red-500">
            {error}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {hashEntries.map(({ label, key }) => (
          <div key={key} className="flex items-center space-x-2">
            <span className="w-32">{label}:</span>
            <input
              data-testid={key}
              readOnly
              value={(hashes as any)[key]}
              className="flex-1 bg-gray-800 p-1 rounded text-white font-mono"
            />
            <button
              data-testid={`copy-${key}`}
              onClick={() => copy((hashes as any)[key])}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2">
        <div className="font-bold">Image perceptual hash</div>
        <div className="flex space-x-4">
          <input data-testid="image-a" type="file" accept="image/*" onChange={(e) => handleImage(e, 'a')} />
          <input data-testid="image-b" type="file" accept="image/*" onChange={(e) => handleImage(e, 'b')} />
        </div>
        {imgErr && (
          <div role="alert" className="text-red-500">{imgErr}</div>
        )}
        <div className="text-sm break-all">Image A: {imgA || 'N/A'}</div>
        <div className="text-sm break-all">Image B: {imgB || 'N/A'}</div>
        {distance !== null && (
          <div className="text-sm">Hamming distance: {distance}</div>
        )}
      </div>
    </div>
  );
};

export default HashToolkit;

