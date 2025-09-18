'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import exifr from 'exifr';
import JSZip from 'jszip';

interface CameraMetadata {
  make?: string;
  model?: string;
  lensMake?: string;
  lensModel?: string;
  dateTaken?: Date | string;
  exposureTime?: number | string;
  aperture?: number | string;
  iso?: number;
  focalLength?: number | string;
}

interface GpsMetadata {
  latitude?: number;
  longitude?: number;
  altitude?: number;
}

interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  created?: string | Date;
  modified?: string | Date;
  lastModifiedBy?: string;
  description?: string;
  category?: string;
}

interface ParsedMetadata {
  fileName: string;
  fileSize: string;
  fileType: string;
  lastModified?: string;
  camera?: CameraMetadata;
  gps?: GpsMetadata;
  document?: DocumentMetadata;
}

type SectionEntry = {
  label: string;
  value?: string | number | null;
};

const MetadataPeek = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [metadata, setMetadata] = useState<ParsedMetadata | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setStatus(null);
    setIsParsing(true);

    try {
      const info: ParsedMetadata = {
        fileName: file.name,
        fileSize: formatBytes(file.size),
        fileType: file.type || inferTypeFromName(file.name) || 'Unknown',
        lastModified: formatDate(new Date(file.lastModified)),
      };

      let camera: CameraMetadata | undefined;
      let gps: GpsMetadata | undefined;
      if (isImageFile(file)) {
        const imageMetadata = await parseImageMetadata(file);
        camera = imageMetadata.camera;
        gps = imageMetadata.gps;
      }

      let document: DocumentMetadata | undefined;
      if (isDocumentFile(file)) {
        const buffer = await file.arrayBuffer();
        document = await extractDocumentMetadata(buffer, file);
      }

      const result: ParsedMetadata = {
        ...info,
        camera,
        gps,
        document,
      };

      setMetadata(result);

      if (!hasValues(camera) && !hasValues(gps) && !hasValues(document)) {
        setStatus('No embedded metadata was detected for this file.');
      }
    } catch (err) {
      console.error('Failed to parse metadata', err);
      setError(
        'Unable to read metadata. The file may be encrypted or use an unsupported format.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleReset = () => {
    setMetadata(null);
    setStatus(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const fileEntries = useMemo<SectionEntry[]>(() => {
    if (!metadata) return [];
    return [
      { label: 'Name', value: metadata.fileName },
      { label: 'Type', value: metadata.fileType },
      { label: 'Size', value: metadata.fileSize },
      { label: 'Last modified', value: metadata.lastModified ?? undefined },
    ];
  }, [metadata]);

  const cameraEntries = useMemo<SectionEntry[]>(() => {
    const camera = metadata?.camera;
    return [
      { label: 'Camera make', value: camera?.make },
      { label: 'Camera model', value: camera?.model },
      { label: 'Lens make', value: camera?.lensMake },
      { label: 'Lens model', value: camera?.lensModel },
      {
        label: 'Captured',
        value: formatDate(camera?.dateTaken),
      },
      {
        label: 'Exposure',
        value: formatExposure(camera?.exposureTime),
      },
      {
        label: 'Aperture',
        value: formatAperture(camera?.aperture),
      },
      {
        label: 'ISO',
        value: camera?.iso ?? undefined,
      },
      {
        label: 'Focal length',
        value: formatFocalLength(camera?.focalLength),
      },
    ];
  }, [metadata?.camera]);

  const gpsEntries = useMemo<SectionEntry[]>(() => {
    const gps = metadata?.gps;
    return [
      {
        label: 'Latitude',
        value:
          gps?.latitude !== undefined
            ? formatCoordinate(gps.latitude, 'N', 'S')
            : undefined,
      },
      {
        label: 'Longitude',
        value:
          gps?.longitude !== undefined
            ? formatCoordinate(gps.longitude, 'E', 'W')
            : undefined,
      },
      {
        label: 'Altitude',
        value:
          gps?.altitude !== undefined ? `${gps.altitude.toFixed(2)} m` : undefined,
      },
    ];
  }, [metadata?.gps]);

  const documentEntries = useMemo<SectionEntry[]>(() => {
    const doc = metadata?.document;
    return [
      { label: 'Title', value: doc?.title },
      { label: 'Author', value: doc?.author },
      { label: 'Subject', value: doc?.subject },
      { label: 'Keywords', value: doc?.keywords },
      { label: 'Creator', value: doc?.creator },
      { label: 'Producer', value: doc?.producer },
      { label: 'Last modified by', value: doc?.lastModifiedBy },
      { label: 'Category', value: doc?.category },
      { label: 'Description', value: doc?.description },
      { label: 'Created', value: formatDate(doc?.created) },
      { label: 'Modified', value: formatDate(doc?.modified) },
    ];
  }, [metadata?.document]);

  return (
    <div className="h-full w-full overflow-auto bg-gray-900 p-4 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <section className="space-y-3 rounded-lg bg-gray-800 p-4 shadow">
          <div>
            <h2 className="text-xl font-semibold">Metadata Peek</h2>
            <p className="text-sm text-gray-300">
              Inspect EXIF and document properties from files directly in your browser.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.tiff,.tif,.heic,.heif,.png,.pdf,.docx,.pptx,.xlsx"
              onChange={handleFileChange}
              className="text-sm text-gray-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
            />
            <button
              type="button"
              onClick={handleReset}
              disabled={!metadata && !status && !error}
              className="rounded-md border border-gray-600 px-3 py-2 text-sm transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
            >
              Reset
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Files are parsed client-side only. Reset clears the parsed data from this session.
          </p>
        </section>

        {isParsing && (
          <div className="rounded-lg bg-gray-800 p-4 text-sm text-blue-200">
            Parsing metadata...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500 bg-red-900/60 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {status && !error && (
          <div className="rounded-lg bg-gray-800 p-4 text-sm text-gray-200">{status}</div>
        )}

        {metadata && (
          <>
            <MetadataSection
              title="File information"
              entries={fileEntries}
              emptyMessage="File details unavailable."
            />
            <MetadataSection
              title="Camera metadata"
              entries={cameraEntries}
              emptyMessage="Camera metadata not available for this file."
            />
            <MetadataSection
              title="GPS coordinates"
              entries={gpsEntries}
              emptyMessage="GPS metadata not present."
            />
            <MetadataSection
              title="Document properties"
              entries={documentEntries}
              emptyMessage="Document metadata not available for this file."
            />
          </>
        )}
      </div>
    </div>
  );
};

export default MetadataPeek;

const MetadataSection = ({
  title,
  entries,
  emptyMessage,
}: {
  title: string;
  entries: SectionEntry[];
  emptyMessage: string;
}) => {
  const hasContent = entries.some((entry) =>
    entry.value !== undefined && entry.value !== null && entry.value !== ''
  );

  return (
    <section className="space-y-3 rounded-lg bg-gray-800 p-4 shadow">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {!hasContent && <p className="text-sm text-gray-400">{emptyMessage}</p>}
      </div>
      <dl className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.label}
            className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm"
          >
            <dt className="text-gray-400">{entry.label}</dt>
            <dd className="font-medium text-gray-100">
              {entry.value !== undefined && entry.value !== null && entry.value !== '' ? (
                entry.value
              ) : (
                <span className="italic text-gray-500">Not available</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

async function parseImageMetadata(file: File): Promise<{
  camera?: CameraMetadata;
  gps?: GpsMetadata;
}> {
  try {
    const data = await exifr.parse(file);
    if (!data) return {};

    const camera = filterEmpty<CameraMetadata>({
      make: (data.Make as string) ?? undefined,
      model: (data.Model as string) ?? undefined,
      lensMake: (data.LensMake as string) ?? undefined,
      lensModel: (data.LensModel as string) ?? undefined,
      dateTaken: (data.DateTimeOriginal as Date | string | undefined) ?? undefined,
      exposureTime: (data.ExposureTime as number | string | undefined) ?? undefined,
      aperture: (data.FNumber as number | string | undefined) ?? undefined,
      iso: (data.ISO as number | undefined) ?? undefined,
      focalLength: (data.FocalLength as number | string | undefined) ?? undefined,
    });

    const gps = filterEmpty<GpsMetadata>({
      latitude: (data.latitude as number | undefined) ?? undefined,
      longitude: (data.longitude as number | undefined) ?? undefined,
      altitude: (data.altitude as number | undefined) ?? undefined,
    });

    return {
      camera: hasValues(camera) ? camera : undefined,
      gps: hasValues(gps) ? gps : undefined,
    };
  } catch (err) {
    console.warn('Failed to parse EXIF data', err);
    return {};
  }
}

async function extractDocumentMetadata(
  buffer: ArrayBuffer,
  file: File
): Promise<DocumentMetadata | undefined> {
  const type = file.type.toLowerCase();
  const extension = getExtension(file.name);

  if (type === 'application/pdf' || extension === 'pdf') {
    return parsePdfMetadata(buffer);
  }

  if (
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    extension === 'docx' ||
    extension === 'pptx' ||
    extension === 'xlsx'
  ) {
    return parseOpenXmlMetadata(buffer);
  }

  return undefined;
}

function parsePdfMetadata(buffer: ArrayBuffer): DocumentMetadata | undefined {
  try {
    const decoded = new TextDecoder('latin1', { fatal: false }).decode(
      new Uint8Array(buffer)
    );

    const title = readPdfField(decoded, 'Title');
    const author = readPdfField(decoded, 'Author');
    const subject = readPdfField(decoded, 'Subject');
    const keywords = readPdfField(decoded, 'Keywords');
    const creator = readPdfField(decoded, 'Creator');
    const producer = readPdfField(decoded, 'Producer');
    const created = formatPdfDate(readPdfField(decoded, 'CreationDate'));
    const modified = formatPdfDate(readPdfField(decoded, 'ModDate'));

    const metadata = filterEmpty<DocumentMetadata>({
      title,
      author,
      subject,
      keywords,
      creator,
      producer,
      created,
      modified,
    });

    return hasValues(metadata) ? metadata : undefined;
  } catch (err) {
    console.warn('Failed to parse PDF metadata', err);
    return undefined;
  }
}

async function parseOpenXmlMetadata(buffer: ArrayBuffer): Promise<DocumentMetadata | undefined> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const core = zip.file('docProps/core.xml');
    if (!core) return undefined;

    const xml = await core.async('text');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const metadata = filterEmpty<DocumentMetadata>({
      title: getTextContent(doc, 'dc:title'),
      subject: getTextContent(doc, 'dc:subject'),
      author: getTextContent(doc, 'dc:creator'),
      keywords: getTextContent(doc, 'cp:keywords'),
      creator: getTextContent(doc, 'cp:lastModifiedBy'),
      description: getTextContent(doc, 'dc:description'),
      category: getTextContent(doc, 'cp:category'),
      lastModifiedBy: getTextContent(doc, 'cp:lastModifiedBy'),
      created: formatDate(getTextContent(doc, 'dcterms:created')),
      modified: formatDate(getTextContent(doc, 'dcterms:modified')),
    });

    return hasValues(metadata) ? metadata : undefined;
  } catch (err) {
    console.warn('Failed to parse OpenXML metadata', err);
    return undefined;
  }
}

function readPdfField(source: string, field: string): string | undefined {
  const literal = new RegExp(`/${field}\\s*\\(([^\\)]*)\\)`, 'i');
  const literalMatch = literal.exec(source);
  if (literalMatch?.[1]) {
    return decodePdfLiteral(literalMatch[1]);
  }

  const hex = new RegExp(`/${field}\\s*<([0-9A-Fa-f]+)>`, 'i');
  const hexMatch = hex.exec(source);
  if (hexMatch?.[1]) {
    return decodePdfHex(hexMatch[1]);
  }

  return undefined;
}

function decodePdfLiteral(value: string): string {
  return value.replace(/\\\)/g, ')').replace(/\\\(/g, '(').replace(/\\\\/g, '\\').trim();
}

function decodePdfHex(value: string): string | undefined {
  try {
    const pairs = value.match(/.{1,2}/g);
    if (!pairs) return undefined;
    const bytes = new Uint8Array(pairs.map((pair) => parseInt(pair, 16)));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
  } catch {
    return undefined;
  }
}

function formatPdfDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(
    /^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([Z\+\-])?(\d{2})'?([\d]{2})'?/
  );
  if (!match) {
    return value;
  }

  const [, year, month, day, hour, minute, second, tzSign, tzHour, tzMinute] = match;
  let iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

  if (!tzSign || tzSign === 'Z') {
    iso += 'Z';
  } else if (tzHour) {
    const minutes = tzMinute ?? '00';
    iso += `${tzSign}${tzHour}:${minutes}`;
  }

  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? value : formatDate(parsed);
}

function getTextContent(doc: Document, tag: string): string | undefined {
  const element = doc.getElementsByTagName(tag)[0];
  const text = element?.textContent?.trim();
  return text ? text : undefined;
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const extension = getExtension(file.name);
  return ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'heic', 'heif'].includes(extension);
}

function isDocumentFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const extension = getExtension(file.name);
  return (
    type === 'application/pdf' ||
    type.includes('officedocument') ||
    ['pdf', 'docx', 'pptx', 'xlsx'].includes(extension)
  );
}

function getExtension(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function inferTypeFromName(name: string): string | undefined {
  const extension = getExtension(name);
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'heic':
    case 'heif':
    case 'tif':
    case 'tiff':
      return `image/${extension}`;
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return undefined;
  }
}

function hasValues<T extends Record<string, unknown> | undefined>(value: T): boolean {
  if (!value) return false;
  return Object.values(value).some(
    (entry) => entry !== undefined && entry !== null && entry !== ''
  );
}

function filterEmpty<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return Object.fromEntries(entries) as T;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : undefined;
  }
  return date.toLocaleString();
}

function formatExposure(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (value === 0) return '0s';
  if (value >= 1) return `${value.toFixed(2)}s`;
  const denominator = Math.round(1 / value);
  return `1/${denominator}`;
}

function formatAperture(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) {
    return typeof value === 'string' ? value : undefined;
  }
  return `f/${numeric.toFixed(1)}`;
}

function formatFocalLength(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) {
    return typeof value === 'string' ? value : undefined;
  }
  return `${numeric.toFixed(1)} mm`;
}

function formatCoordinate(value: number, positive: string, negative: string): string {
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(6)}° ${direction}`;
}

export type { ParsedMetadata };
