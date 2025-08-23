import React, { useState } from 'react';

interface Section { name: string; address: number; size: number; }

interface Parsed {
  format: 'ELF' | 'PE';
  entryPoint: number;
  arch: string;
  compileTime?: string;
  sections: Section[];
}

const BinaryHeader: React.FC = () => {
  const [info, setInfo] = useState<Parsed | null>(null);
  const [error, setError] = useState('');

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await (file.arrayBuffer?.() || fileToArrayBuffer(file));
    const bytes = new Uint8Array(buf);
    const dv = new DataView(buf);
    try {
      if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
        setInfo(parseElf(dv, bytes));
        setError('');
      } else if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
        const parsed = parsePe(dv);
        if (!parsed) throw new Error('Unsupported PE format');
        setInfo(parsed);
        setError('');
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (err: any) {
      setError(err.message || 'Parse error');
      setInfo(null);
    }
  };

  const exportJson = () => {
    if (!info) return;
    const blob = new Blob([JSON.stringify(info, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'header.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col space-y-4">
      <input type="file" onChange={onFile} className="text-sm" data-testid="file-input" />
      {error && <div className="text-red-500" data-testid="error">{error}</div>}
      {info && (
        <div className="space-y-2 overflow-auto" data-testid="info">
          <div>Format: {info.format}</div>
          <div>Architecture: {info.arch}</div>
          <div>Compile Time: {info.compileTime || 'N/A'}</div>
          <div>Entry Point: 0x{info.entryPoint.toString(16)}</div>
          <div>
            Sections:
            <ul className="list-disc ml-4">
              {info.sections.map((s, i) => (
                <li key={`${s.name}-${i}`}>
                  {s.name} (addr 0x{s.address.toString(16)}, size {s.size})
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={exportJson}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
};

function parseElf(dv: DataView, bytes: Uint8Array): Parsed {
  const clazz = dv.getUint8(4);
  const little = dv.getUint8(5) === 1;
  const machine = dv.getUint16(18, little);
  let entry: number;
  let shoff: number;
  let shentsize: number;
  let shnum: number;
  let shstrndx: number;
  if (clazz === 1) {
    entry = dv.getUint32(24, little);
    shoff = dv.getUint32(32, little);
    shentsize = dv.getUint16(46, little);
    shnum = dv.getUint16(48, little);
    shstrndx = dv.getUint16(50, little);
  } else if (clazz === 2) {
    entry = Number(dv.getBigUint64(24, little));
    shoff = Number(dv.getBigUint64(40, little));
    shentsize = dv.getUint16(58, little);
    shnum = dv.getUint16(60, little);
    shstrndx = dv.getUint16(62, little);
  } else {
    throw new Error('Unsupported ELF class');
  }
  const shstrOffset = shoff + shstrndx * shentsize;
  const strOff =
    clazz === 1
      ? dv.getUint32(shstrOffset + 16, little)
      : Number(dv.getBigUint64(shstrOffset + 24, little));
  const strSize =
    clazz === 1
      ? dv.getUint32(shstrOffset + 20, little)
      : Number(dv.getBigUint64(shstrOffset + 32, little));
  const strTab = new Uint8Array(bytes.buffer, strOff, strSize);
  const sections: Section[] = [];
  for (let i = 0; i < shnum; i += 1) {
    const base = shoff + i * shentsize;
    const nameOff = dv.getUint32(base, little);
    const secOff =
      clazz === 1
        ? dv.getUint32(base + 16, little)
        : Number(dv.getBigUint64(base + 24, little));
    const secSize =
      clazz === 1
        ? dv.getUint32(base + 20, little)
        : Number(dv.getBigUint64(base + 32, little));
    let name = '';
    let idx = nameOff;
    while (idx < strTab.length && strTab[idx] !== 0) {
      name += String.fromCharCode(strTab[idx]);
      idx += 1;
    }
    sections.push({ name: name || '(unnamed)', address: secOff, size: secSize });
  }
  const archMap: Record<number, string> = {
    3: 'x86',
    62: 'x86-64',
    40: 'ARM',
    183: 'AArch64',
    243: 'RISC-V',
  };
  return {
    format: 'ELF',
    entryPoint: entry,
    arch: archMap[machine] || `Machine ${machine}`,
    sections,
  };
}

function parsePe(dv: DataView): Parsed | null {
  const peOffset = dv.getUint32(0x3c, true);
  if (dv.getUint32(peOffset, true) !== 0x4550) return null;
  const machine = dv.getUint16(peOffset + 4, true);
  const numSections = dv.getUint16(peOffset + 6, true);
  const timeDateStamp = dv.getUint32(peOffset + 8, true);
  const optSize = dv.getUint16(peOffset + 20, true);
  const optOffset = peOffset + 24;
  const magic = dv.getUint16(optOffset, true);
  let entry: number;
  if (magic === 0x10b || magic === 0x20b) {
    entry = dv.getUint32(optOffset + 16, true);
  } else {
    return null;
  }
  const sectionOffset = optOffset + optSize;
  const sections: Section[] = [];
  for (let i = 0; i < numSections; i += 1) {
    const base = sectionOffset + i * 40;
    let name = '';
    for (let j = 0; j < 8; j += 1) {
      const c = dv.getUint8(base + j);
      if (c === 0) break;
      name += String.fromCharCode(c);
    }
    const va = dv.getUint32(base + 12, true);
    const size = dv.getUint32(base + 16, true);
    sections.push({ name: name || '(unnamed)', address: va, size });
  }
  const archMap: Record<number, string> = {
    0x14c: 'x86',
    0x8664: 'x86-64',
    0x1c0: 'ARM',
    0xaa64: 'AArch64',
  };
  const compileTime = new Date(timeDateStamp * 1000).toISOString();
  return {
    format: 'PE',
    entryPoint: entry,
    arch: archMap[machine] || `Machine 0x${machine.toString(16)}`,
    compileTime,
    sections,
  };
}

export default BinaryHeader;

function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

