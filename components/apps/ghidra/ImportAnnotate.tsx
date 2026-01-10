import React, { useState } from 'react';

interface ParsedData {
  sections: string[];
  strings: string[];
}

function extractStrings(bytes: Uint8Array): string[] {
  const out: string[] = [];
  let current = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 0x20 && b <= 0x7e) {
      current += String.fromCharCode(b);
    } else {
      if (current.length >= 4) out.push(current);
      current = '';
    }
  }
  if (current.length >= 4) out.push(current);
  return out.slice(0, 1000);
}

function parsePE(bytes: Uint8Array): ParsedData {
  const dv = new DataView(bytes.buffer);
  const sections: string[] = [];
  if (dv.getUint16(0, false) !== 0x4d5a) {
    return { sections, strings: extractStrings(bytes) };
  }
  const peOffset = dv.getUint32(0x3c, true);
  if (dv.getUint32(peOffset, false) !== 0x50450000) {
    return { sections, strings: extractStrings(bytes) };
  }
  const numSections = dv.getUint16(peOffset + 6, true);
  const optHeaderSize = dv.getUint16(peOffset + 20, true);
  let sectionTable = peOffset + 24 + optHeaderSize;
  for (let i = 0; i < numSections; i++) {
    const nameBytes = bytes.slice(sectionTable, sectionTable + 8);
    const name = String.fromCharCode(...nameBytes).replace(/\0.*$/, '');
    sections.push(name);
    sectionTable += 40;
  }
  return { sections, strings: extractStrings(bytes) };
}

function parseELF(bytes: Uint8Array): ParsedData {
  const dv = new DataView(bytes.buffer);
  const sections: string[] = [];
  const little = dv.getUint8(5) === 1;
  const is32 = dv.getUint8(4) === 1;
  let shoff = 0;
  let shentsize = 0;
  let shnum = 0;
  let shstrndx = 0;
  if (is32) {
    shoff = dv.getUint32(0x20, little);
    shentsize = dv.getUint16(0x2e, little);
    shnum = dv.getUint16(0x30, little);
    shstrndx = dv.getUint16(0x32, little);
  } else {
    shoff = Number(dv.getBigUint64(0x28, little));
    shentsize = dv.getUint16(0x3a, little);
    shnum = dv.getUint16(0x3c, little);
    shstrndx = dv.getUint16(0x3e, little);
  }
  let strOff = 0;
  let strSize = 0;
  const strHdr = shoff + shstrndx * shentsize;
  if (is32) {
    strOff = dv.getUint32(strHdr + 0x10, little);
    strSize = dv.getUint32(strHdr + 0x14, little);
  } else {
    strOff = Number(dv.getBigUint64(strHdr + 0x18, little));
    strSize = Number(dv.getBigUint64(strHdr + 0x20, little));
  }
  const strTable = bytes.slice(strOff, strOff + strSize);
  for (let i = 0; i < shnum; i++) {
    const off = shoff + i * shentsize;
    const nameOff = dv.getUint32(off, little);
    let name = '';
    for (let j = nameOff; j < strTable.length && strTable[j] !== 0; j++) {
      name += String.fromCharCode(strTable[j]);
    }
    sections.push(name);
  }
  return { sections, strings: extractStrings(bytes) };
}

export default function ImportAnnotate() {
  const [sections, setSections] = useState<string[]>([]);
  const [strings, setStrings] = useState<string[]>([]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let parsed: ParsedData = { sections: [], strings: [] };
    if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
      parsed = parsePE(bytes);
    } else if (
      bytes[0] === 0x7f &&
      bytes[1] === 0x45 &&
      bytes[2] === 0x4c &&
      bytes[3] === 0x46
    ) {
      parsed = parseELF(bytes);
    }
    setSections(parsed.sections);
    setStrings(parsed.strings);
  };

  return (
    <div className="text-xs md:text-sm">
      <label htmlFor="ghidra-import-file" className="block mb-1">
        Upload PE or ELF file
      </label>
      <input
        id="ghidra-import-file"
        type="file"
        accept=".exe,.dll,.bin,.elf"
        onChange={handleFile}
        aria-label="Upload PE or ELF file"
        className="mb-2"
      />
      <div className="flex flex-wrap gap-4">
        <div>
          <h3 className="font-bold">Sections</h3>
          <ul className="list-disc pl-4">
            {sections.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="max-h-48 overflow-auto">
          <h3 className="font-bold">Strings</h3>
          <ul className="list-disc pl-4">
            {strings.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
