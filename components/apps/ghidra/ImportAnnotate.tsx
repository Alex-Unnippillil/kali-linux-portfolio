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

const FORMAT_GUIDANCE = [
  {
    title: 'Portable Executable (.exe, .dll)',
    description:
      'Great for Windows malware and tooling. We enumerate PE sections and extract printable strings for triage.',
  },
  {
    title: 'ELF binaries (.elf)',
    description:
      'Use for Linux utilities or firmware. Section headers are parsed and strings are surfaced to speed up reconnaissance.',
  },
  {
    title: 'Raw binary dumps (.bin)',
    description:
      'Supported for quick string scraping. Convert to ELF/PE with objcopy for richer metadata.',
  },
];

const INPUT_ID = 'ghidra-import-input';

export default function ImportAnnotate() {
  const [sections, setSections] = useState<string[]>([]);
  const [strings, setStrings] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    setStatusMessage('');
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const extension = file.name.split('.').pop()?.toLowerCase();
    let parsed: ParsedData = { sections: [], strings: [] };
    if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
      parsed = parsePE(bytes);
      setStatusMessage(
        'Portable Executable detected. Sections and printable strings are listed below.'
      );
    } else if (
      bytes[0] === 0x7f &&
      bytes[1] === 0x45 &&
      bytes[2] === 0x4c &&
      bytes[3] === 0x46
    ) {
      parsed = parseELF(bytes);
      setStatusMessage('ELF binary detected. Section headers and strings are ready for review.');
    } else if (extension === 'bin') {
      parsed = { sections: [], strings: extractStrings(bytes) };
      setStatusMessage(
        'Raw binary loaded. Showing printable strings only — convert with `objcopy --input-target binary --output-target elf32-i386 sample.bin sample.elf` for more metadata.'
      );
    } else {
      setSections([]);
      setStrings([]);
      setErrorMessage(
        "We couldn't recognise this format. Export it as an ELF or PE file, or use `objcopy --input-target binary --output-target elf32-i386 input.bin output.elf` before re-uploading."
      );
      return;
    }
    setSections(parsed.sections);
    setStrings(parsed.strings);
  };

  return (
    <div className="text-xs md:text-sm space-y-3">
      <div>
        <label className="block font-semibold" htmlFor={INPUT_ID}>
          Upload PE, ELF, or raw binary
        </label>
        <p className="text-gray-300">Drop a sample to annotate imports and surface quick IoCs.</p>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {FORMAT_GUIDANCE.map((item) => (
          <div key={item.title} className="rounded border border-gray-700 p-2">
            <h3 className="font-bold">{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept=".exe,.dll,.bin,.elf"
        onChange={handleFile}
        id={INPUT_ID}
        className="mb-1"
      />
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="rounded bg-emerald-900/60 p-2 text-emerald-100"
        >
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded bg-red-900/70 p-2 text-red-100"
        >
          {errorMessage}
        </div>
      )}
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
