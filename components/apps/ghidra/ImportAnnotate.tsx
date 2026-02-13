import React, { useMemo, useState } from 'react';

type StringType = 'ASCII' | 'Unicode';

interface AnalyzedString {
  value: string;
  type: StringType;
}

type LibrarySource = 'libc' | 'win32' | 'crypto' | 'network' | 'other';

interface ImportEntry {
  name: string;
  library: LibrarySource;
}

interface SectionHeader {
  name: string;
  virtualAddress: number;
  virtualSize: number;
  pointerToRawData: number;
  sizeOfRawData: number;
}

interface BinaryMetadata {
  sections: string[];
  imports: string[];
}

interface ImportAnnotateProps {
  initialSections?: string[];
  initialStrings?: AnalyzedString[];
  initialImports?: string[];
}

function extractAsciiStrings(bytes: Uint8Array): AnalyzedString[] {
  const out: AnalyzedString[] = [];
  let current = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b >= 0x20 && b <= 0x7e) {
      current += String.fromCharCode(b);
    } else {
      if (current.length >= 4) out.push({ value: current, type: 'ASCII' });
      current = '';
    }
  }
  if (current.length >= 4) out.push({ value: current, type: 'ASCII' });
  return out;
}

function extractUnicodeStrings(bytes: Uint8Array): AnalyzedString[] {
  const out: AnalyzedString[] = [];
  let i = 0;
  while (i < bytes.length - 1) {
    const first = bytes[i];
    const second = bytes[i + 1];
    if (first >= 0x20 && first <= 0x7e && second === 0x0) {
      let value = '';
      let cursor = i;
      while (
        cursor < bytes.length - 1 &&
        bytes[cursor] >= 0x20 &&
        bytes[cursor] <= 0x7e &&
        bytes[cursor + 1] === 0x0
      ) {
        value += String.fromCharCode(bytes[cursor]);
        cursor += 2;
      }
      if (value.length >= 4) {
        out.push({ value, type: 'Unicode' });
      }
      i = cursor;
    } else {
      i += 1;
    }
  }
  return out;
}

function extractStrings(bytes: Uint8Array): AnalyzedString[] {
  const ascii = extractAsciiStrings(bytes);
  const unicode = extractUnicodeStrings(bytes);
  const seen = new Set<string>();
  const results: AnalyzedString[] = [];
  [...ascii, ...unicode].forEach((entry) => {
    const key = `${entry.type}:${entry.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(entry);
    }
  });
  return results.slice(0, 1000);
}

function readNullTerminatedString(bytes: Uint8Array, offset: number | null): string {
  if (offset === null || offset < 0 || offset >= bytes.length) return '';
  let end = offset;
  while (end < bytes.length && bytes[end] !== 0) {
    end += 1;
  }
  return String.fromCharCode(...bytes.slice(offset, end));
}

function rvaToOffset(rva: number, sections: SectionHeader[]): number | null {
  for (const section of sections) {
    const start = section.virtualAddress;
    const end = start + section.virtualSize;
    if (rva >= start && rva < end) {
      return rva - start + section.pointerToRawData;
    }
  }
  return null;
}

function parsePE(bytes: Uint8Array): BinaryMetadata {
  const dv = new DataView(bytes.buffer);
  const sections: string[] = [];
  const sectionHeaders: SectionHeader[] = [];
  if (dv.getUint16(0, false) !== 0x4d5a) {
    return { sections, imports: [] };
  }
  const peOffset = dv.getUint32(0x3c, true);
  if (dv.getUint32(peOffset, false) !== 0x50450000) {
    return { sections, imports: [] };
  }
  const numSections = dv.getUint16(peOffset + 6, true);
  const optHeaderSize = dv.getUint16(peOffset + 20, true);
  const optionalHeaderMagic = dv.getUint16(peOffset + 24, true);
  const is64 = optionalHeaderMagic === 0x20b;
  const dataDirStart = peOffset + 24 + (is64 ? 112 : 96);
  const importDirRva = dv.getUint32(dataDirStart + 8, true);
  const importDirSize = dv.getUint32(dataDirStart + 12, true);

  let sectionTable = peOffset + 24 + optHeaderSize;
  for (let i = 0; i < numSections; i += 1) {
    const nameBytes = bytes.slice(sectionTable, sectionTable + 8);
    const name = String.fromCharCode(...nameBytes).replace(/\0.*$/, '');
    sections.push(name);
    sectionHeaders.push({
      name,
      virtualAddress: dv.getUint32(sectionTable + 12, true),
      virtualSize: dv.getUint32(sectionTable + 8, true),
      pointerToRawData: dv.getUint32(sectionTable + 20, true),
      sizeOfRawData: dv.getUint32(sectionTable + 16, true),
    });
    sectionTable += 40;
  }

  if (!importDirRva || !importDirSize) {
    return { sections, imports: [] };
  }

  const imports = new Set<string>();
  const descriptorOffset = rvaToOffset(importDirRva, sectionHeaders);
  if (descriptorOffset === null) {
    return { sections, imports: [] };
  }

  const ordinalFlag32 = 0x80000000;
  const ordinalFlag64 = 0x8000000000000000n;
  let cursor = descriptorOffset;
  while (cursor + 20 <= bytes.length) {
    const originalFirstThunk = dv.getUint32(cursor, true);
    const timeDateStamp = dv.getUint32(cursor + 4, true);
    const forwarderChain = dv.getUint32(cursor + 8, true);
    const nameRva = dv.getUint32(cursor + 12, true);
    const firstThunk = dv.getUint32(cursor + 16, true);
    if (
      originalFirstThunk === 0 &&
      timeDateStamp === 0 &&
      forwarderChain === 0 &&
      nameRva === 0 &&
      firstThunk === 0
    ) {
      break;
    }

    const thunkRva = originalFirstThunk !== 0 ? originalFirstThunk : firstThunk;
    const thunkOffset = rvaToOffset(thunkRva, sectionHeaders);
    if (thunkOffset !== null) {
      let thunkCursor = thunkOffset;
      while (thunkCursor < bytes.length) {
        if (is64) {
          const thunkData = dv.getBigUint64(thunkCursor, true);
          if (thunkData === 0n) break;
          if ((thunkData & ordinalFlag64) === 0n) {
            const hintNameOffset = rvaToOffset(Number(thunkData), sectionHeaders);
            if (hintNameOffset !== null) {
              const symbol = readNullTerminatedString(
                bytes,
                hintNameOffset + 2
              );
              if (symbol) imports.add(symbol);
            }
          }
          thunkCursor += 8;
        } else {
          const thunkData = dv.getUint32(thunkCursor, true);
          if (thunkData === 0) break;
          if ((thunkData & ordinalFlag32) === 0) {
            const hintNameOffset = rvaToOffset(thunkData, sectionHeaders);
            if (hintNameOffset !== null) {
              const symbol = readNullTerminatedString(
                bytes,
                hintNameOffset + 2
              );
              if (symbol) imports.add(symbol);
            }
          }
          thunkCursor += 4;
        }
      }
    }

    cursor += 20;
  }

  return { sections, imports: Array.from(imports) };
}

function parseELF(bytes: Uint8Array): BinaryMetadata {
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
  for (let i = 0; i < shnum; i += 1) {
    const off = shoff + i * shentsize;
    const nameOff = dv.getUint32(off, little);
    let name = '';
    for (let j = nameOff; j < strTable.length && strTable[j] !== 0; j += 1) {
      name += String.fromCharCode(strTable[j]);
    }
    sections.push(name);
  }
  return { sections, imports: [] };
}

const LIBC_KEYWORDS = [
  'printf',
  'scanf',
  'sprintf',
  'snprintf',
  'strlen',
  'strcpy',
  'strcmp',
  'strncpy',
  'strcat',
  'memcpy',
  'memset',
  'malloc',
  'free',
  'calloc',
  'realloc',
  'puts',
  'gets',
  'exit',
  'fopen',
  'fclose',
  'atoi',
  'atol',
  'tolower',
  'toupper',
];

function categorizeLibrary(name: string): LibrarySource {
  const normalized = name.replace(/^__imp__?/, '').toLowerCase();
  if (LIBC_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'libc';
  }
  if (/^(?:(?:lstr|str|wc)[a-z]+|_?imp__?(?:printf|scanf|str|mem))/.test(normalized)) {
    return 'libc';
  }
  if (
    /^(_?imp__)?(get|set|create|open|close|delete|reg|format|virtual|load|read|write|wait|find|show|is|post|send|recv|message|shell|url|win|global|local|multi|widechar|multibyte|sleep|co|crypt|internet|http|inet|wsa|socket)/i.test(
      name
    )
  ) {
    if (normalized.includes('crypt')) {
      return 'crypto';
    }
    if (
      normalized.includes('http') ||
      normalized.includes('inet') ||
      normalized.includes('socket') ||
      normalized.includes('wsa')
    ) {
      return 'network';
    }
    return 'win32';
  }
  if (
    normalized.includes('crypt') ||
    normalized.includes('aes') ||
    normalized.includes('sha')
  ) {
    return 'crypto';
  }
  if (
    normalized.includes('http') ||
    normalized.includes('inet') ||
    normalized.includes('socket') ||
    normalized.includes('wsa') ||
    normalized.includes('net')
  ) {
    return 'network';
  }
  return 'other';
}

function guessImports(strings: AnalyzedString[]): string[] {
  const candidates = new Set<string>();
  strings.forEach((entry) => {
    const value = entry.value;
    const normalized = value.replace(/^__imp__?/, '');
    const lower = normalized.toLowerCase();
    if (LIBC_KEYWORDS.some((kw) => lower.includes(kw))) {
      candidates.add(normalized);
      return;
    }
    if (
      /^(__imp__)?[A-Za-z_][A-Za-z0-9_@]+$/.test(value) &&
      (/[A-Z]/.test(value) || value.endsWith('A') || value.endsWith('W'))
    ) {
      candidates.add(normalized);
    }
    if (
      /^(Get|Set|Create|Open|Close|Delete|Read|Write|Reg|Format|Virtual|Load|Wait|Find|Show|Is|Post|Send|Recv|Message|Shell|Url|Win|Global|Local|Multi|Wide|Co|Crypt|Internet|Http|Inet|WSA|Socket)/.test(
        value
      )
    ) {
      candidates.add(normalized);
    }
  });
  return Array.from(candidates);
}

function annotateImports(names: string[]): ImportEntry[] {
  const seen = new Set<string>();
  return names
    .map((raw) => raw.replace(/^__imp__?/, ''))
    .filter((name) => {
      if (!name) return false;
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((name) => ({ name, library: categorizeLibrary(name) }));
}

const LIBRARY_LABELS: Record<LibrarySource, string> = {
  libc: 'libc',
  win32: 'Win32',
  crypto: 'Crypto',
  network: 'Network',
  other: 'Other',
};

const LIBRARY_STYLES: Record<LibrarySource, string> = {
  libc: 'bg-purple-700',
  win32: 'bg-blue-700',
  crypto: 'bg-green-700',
  network: 'bg-teal-700',
  other: 'bg-gray-700',
};

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="w-3 h-3"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 2.5C5 1.67157 5.67157 1 6.5 1H13.5C14.3284 1 15 1.67157 15 2.5V9.5C15 10.3284 14.3284 11 13.5 11H6.5C5.67157 11 5 10.3284 5 9.5V2.5Z"
        stroke="currentColor"
      />
      <path
        d="M2.5 5H4V11.5C4 12.3284 4.67157 13 5.5 13H12V14.5C12 15.3284 11.3284 16 10.5 16H3.5C2.67157 16 2 15.3284 2 14.5V6C2 5.72386 2.22386 5.5 2.5 5Z"
        stroke="currentColor"
      />
    </svg>
  );
}

export default function ImportAnnotate({
  initialSections = [],
  initialStrings = [],
  initialImports = [],
}: ImportAnnotateProps) {
  const [sections, setSections] = useState<string[]>(initialSections);
  const [strings, setStrings] = useState<AnalyzedString[]>(initialStrings);
  const [imports, setImports] = useState<ImportEntry[]>(() =>
    annotateImports(initialImports)
  );
  const [libraryFilter, setLibraryFilter] = useState<LibrarySource | 'all'>(
    'all'
  );
  const [stringTypeFilter, setStringTypeFilter] = useState<StringType | 'all'>(
    'all'
  );

  const filteredImports = useMemo(() => {
    if (libraryFilter === 'all') return imports;
    return imports.filter((imp) => imp.library === libraryFilter);
  }, [imports, libraryFilter]);

  const filteredStrings = useMemo(() => {
    if (stringTypeFilter === 'all') return strings;
    return strings.filter((s) => s.type === stringTypeFilter);
  }, [strings, stringTypeFilter]);

  const handleCopy = async (text: string) => {
    if (typeof navigator === 'undefined') return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      // noop: clipboard may be unavailable in some environments
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const stringsData = extractStrings(bytes);
    let metadata: BinaryMetadata = { sections: [], imports: [] };
    if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
      metadata = parsePE(bytes);
    } else if (
      bytes[0] === 0x7f &&
      bytes[1] === 0x45 &&
      bytes[2] === 0x4c &&
      bytes[3] === 0x46
    ) {
      metadata = parseELF(bytes);
    }
    const resolvedImports = metadata.imports.length
      ? metadata.imports
      : guessImports(stringsData);
    setSections(metadata.sections);
    setStrings(stringsData);
    setImports(annotateImports(resolvedImports));
  };

  return (
    <div className="text-xs md:text-sm space-y-3">
      <label htmlFor="binary-upload" className="block mb-1">
        Upload PE or ELF file
      </label>
      <input
        type="file"
        accept=".exe,.dll,.bin,.elf"
        id="binary-upload"
        aria-label="Upload PE or ELF file"
        onChange={handleFile}
        className="mb-2"
      />
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[160px]">
          <h3 className="font-bold">Sections</h3>
          <ul
            role="list"
            aria-label="Binary sections"
            className="list-disc pl-4 max-h-48 overflow-auto"
          >
            {sections.map((s) => (
              <li key={s}>{s}</li>
            ))}
            {sections.length === 0 && <li>No sections parsed yet.</li>}
          </ul>
        </div>
        <div className="flex-1 min-w-[220px] space-y-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Imports</h3>
              <label htmlFor="import-library-filter" className="sr-only">
                Filter imports by library
              </label>
              <select
                id="import-library-filter"
                value={libraryFilter}
                onChange={(event) =>
                  setLibraryFilter(event.target.value as LibrarySource | 'all')
                }
                className="text-black rounded px-1 py-0.5"
              >
                <option value="all">All libraries</option>
                <option value="libc">libc</option>
                <option value="win32">Win32</option>
                <option value="crypto">Crypto</option>
                <option value="network">Network</option>
                <option value="other">Other</option>
              </select>
            </div>
            <ul
              role="list"
              aria-label="Imported symbols"
              className="max-h-48 overflow-auto space-y-1 pr-1"
            >
              {filteredImports.length === 0 ? (
                <li>No imports match the current filter.</li>
              ) : (
                filteredImports.map((imp) => (
                  <li
                    key={imp.name}
                    className="flex items-center justify-between gap-2 bg-gray-800 rounded px-2 py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs md:text-sm">
                        {imp.name}
                      </span>
                      <span
                        className={`text-[0.6rem] uppercase tracking-wide px-2 py-0.5 rounded ${LIBRARY_STYLES[imp.library]}`}
                      >
                        {LIBRARY_LABELS[imp.library]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(imp.name)}
                      className="text-gray-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded p-1"
                      aria-label={`Copy symbol ${imp.name}`}
                    >
                      <CopyIcon />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Strings</h3>
              <label htmlFor="string-type-filter" className="sr-only">
                Filter strings by encoding
              </label>
              <select
                id="string-type-filter"
                value={stringTypeFilter}
                onChange={(event) =>
                  setStringTypeFilter(event.target.value as StringType | 'all')
                }
                className="text-black rounded px-1 py-0.5"
              >
                <option value="all">All types</option>
                <option value="ASCII">ASCII</option>
                <option value="Unicode">Unicode</option>
              </select>
            </div>
            <ul
              role="list"
              aria-label="Extracted strings"
              className="max-h-48 overflow-auto space-y-1 pr-1"
            >
              {filteredStrings.length === 0 ? (
                <li>No strings match the current filter.</li>
              ) : (
                filteredStrings.map((s, index) => (
                  <li
                    key={`${s.value}-${index}`}
                    className="flex items-center justify-between gap-2 bg-gray-800 rounded px-2 py-1"
                  >
                    <span className="truncate" title={s.value}>
                      {s.value}
                    </span>
                    <span className="text-[0.65rem] uppercase tracking-wide px-2 py-0.5 rounded bg-gray-700">
                      {s.type}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { AnalyzedString, LibrarySource };
