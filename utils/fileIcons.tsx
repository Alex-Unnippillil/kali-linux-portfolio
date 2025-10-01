import type { JSX, ReactNode, SVGProps } from 'react';

export type FileIconKey =
  | 'archive'
  | 'audio'
  | 'binary'
  | 'code'
  | 'config'
  | 'document'
  | 'image'
  | 'markdown'
  | 'pdf'
  | 'presentation'
  | 'spreadsheet'
  | 'terminal'
  | 'text'
  | 'vector'
  | 'video';

export const FALLBACK_ICON_KEY: FileIconKey = 'document';

const MIME_ICON_MAP: Record<string, FileIconKey> = {
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-powerpoint': 'presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.oasis.opendocument.text': 'document',
  'application/vnd.oasis.opendocument.presentation': 'presentation',
  'application/vnd.oasis.opendocument.spreadsheet': 'spreadsheet',
  'application/json': 'code',
  'application/javascript': 'code',
  'application/x-sh': 'terminal',
  'application/x-bash': 'terminal',
  'application/x-7z-compressed': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/zip': 'archive',
  'application/x-tar': 'archive',
  'application/gzip': 'archive',
  'application/x-bzip2': 'archive',
  'application/x-xz': 'archive',
  'application/octet-stream': 'binary',
  'text/plain': 'text',
  'text/csv': 'spreadsheet',
  'text/markdown': 'markdown',
  'text/html': 'code',
  'text/css': 'code',
  'text/x-python': 'code',
  'text/x-go': 'code',
  'text/x-c': 'code',
  'text/x-c++': 'code',
  'text/x-shellscript': 'terminal',
};

const MIME_PREFIX_MAP: Array<{ prefix: string; icon: FileIconKey }> = [
  { prefix: 'image/', icon: 'image' },
  { prefix: 'audio/', icon: 'audio' },
  { prefix: 'video/', icon: 'video' },
  { prefix: 'text/', icon: 'text' },
];

const EXTENSION_ICON_MAP: Record<string, FileIconKey> = {
  jpg: 'image',
  jpeg: 'image',
  jpe: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  heic: 'image',
  heif: 'image',
  avif: 'image',
  svg: 'vector',
  psd: 'image',
  ai: 'vector',
  eps: 'vector',
  raw: 'image',
  mp4: 'video',
  m4v: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video',
  mpg: 'video',
  mpeg: 'video',
  mp3: 'audio',
  wav: 'audio',
  aac: 'audio',
  flac: 'audio',
  ogg: 'audio',
  oga: 'audio',
  opus: 'audio',
  mid: 'audio',
  midi: 'audio',
  pdf: 'pdf',
  doc: 'document',
  docx: 'document',
  rtf: 'document',
  pages: 'document',
  txt: 'text',
  log: 'text',
  md: 'markdown',
  markdown: 'markdown',
  csv: 'spreadsheet',
  tsv: 'spreadsheet',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  numbers: 'spreadsheet',
  ppt: 'presentation',
  pptx: 'presentation',
  key: 'presentation',
  yml: 'config',
  yaml: 'config',
  json: 'code',
  jsonc: 'code',
  js: 'code',
  mjs: 'code',
  cjs: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  html: 'code',
  css: 'code',
  scss: 'code',
  sass: 'code',
  less: 'code',
  py: 'code',
  go: 'code',
  rs: 'code',
  rb: 'code',
  php: 'code',
  java: 'code',
  kt: 'code',
  swift: 'code',
  c: 'code',
  h: 'code',
  hpp: 'code',
  cpp: 'code',
  cs: 'code',
  sh: 'terminal',
  bash: 'terminal',
  zsh: 'terminal',
  fish: 'terminal',
  bat: 'terminal',
  powershell: 'terminal',
  ini: 'config',
  conf: 'config',
  cfg: 'config',
  env: 'config',
  lock: 'config',
  toml: 'config',
  yamlc: 'config',
  sql: 'code',
  db: 'binary',
  sqlite: 'binary',
  apk: 'binary',
  exe: 'binary',
  bin: 'binary',
  dmg: 'binary',
  iso: 'binary',
  img: 'binary',
  ics: 'text',
  vcs: 'text',
  zip: 'archive',
  'tar.gz': 'archive',
  tgz: 'archive',
  gz: 'archive',
  bz2: 'archive',
  xz: 'archive',
  rar: 'archive',
  '7z': 'archive',
};

function createIcon(pathCommands: string[], options?: { filled?: boolean }) {
  return function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true" {...props}>
        <path
          d="M6 2h7l5 5v15H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
          fill={options?.filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          opacity={options?.filled ? 0.15 : 1}
        />
        {pathCommands.map((d, index) => (
          <path key={index} d={d} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        ))}
      </svg>
    );
  };
}

function createVariantIcon(children: ReactNode) {
  return function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true" {...props}>
        {children}
      </svg>
    );
  };
}

const DocumentIcon = createIcon(['M9 9h4M9 13h6M9 17h6']);
const ImageIcon = createIcon(['M8 15l3-3 3 3 3-4 1 2', 'M8.5 7.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3']);
const VideoIcon = createVariantIcon(
  <>
    <path d="M6 4h9a1 1 0 0 1 1 1v2l3-2v14l-3-2v2a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 10l4 2-4 2v-4z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const AudioIcon = createVariantIcon(
  <>
    <path d="M10 15.5a2.5 2.5 0 1 1-5 0v-7a2.5 2.5 0 1 1 5 0v7z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 10c1.657 0 3 1.343 3 3v2.5a3.5 3.5 0 0 1-7 0V6.5a2.5 2.5 0 0 1 5 0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const ArchiveIcon = createVariantIcon(
  <>
    <rect x={5} y={3} width={14} height={5} rx={1} fill="none" stroke="currentColor" strokeWidth={1.5} />
    <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 12h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  </>
);
const MarkdownIcon = createIcon(['M8 9v6M12 9v6M12 12h0.01M16 9v6l2-2.5L20 15']);
const CodeIcon = createVariantIcon(
  <>
    <path d="M9.5 9L5 12l4.5 3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.5 9L19 12l-4.5 3" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const TerminalIcon = createVariantIcon(
  <>
    <rect x={4} y={4} width={16} height={16} rx={2} fill="none" stroke="currentColor" strokeWidth={1.5} />
    <path d="M8 8l3 4-3 4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.5 16H16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  </>
);
const SpreadsheetIcon = createIcon(['M8 9h8M8 13h8M10.5 9v8M13.5 9v8']);
const PresentationIcon = createVariantIcon(
  <>
    <path d="M5 5h14v10H5z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 13h14M12 15v4M9 19h6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 9h3a2 2 0 1 1 0 4H9V9z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const ConfigIcon = createVariantIcon(
  <>
    <path d="M6 10h12M6 14h12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7v10M15 7v10" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const BinaryIcon = createVariantIcon(
  <>
    <rect x={5} y={5} width={14} height={14} rx={2} fill="none" stroke="currentColor" strokeWidth={1.5} />
    <path d="M9 9v6M15 9v6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <path d="M7 12h4M13 12h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  </>
);
const TextIcon = createIcon(['M8 9h8M8 13h8M8 17h5']);
const VectorIcon = createVariantIcon(
  <>
    <path d="M6 6h12v12H6z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 12h12M12 6v12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <circle cx={12} cy={12} r={2} fill="none" stroke="currentColor" strokeWidth={1.5} />
  </>
);

export const FILE_ICON_COMPONENTS: Record<FileIconKey, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  archive: ArchiveIcon,
  audio: AudioIcon,
  binary: BinaryIcon,
  code: CodeIcon,
  config: ConfigIcon,
  document: DocumentIcon,
  image: ImageIcon,
  markdown: MarkdownIcon,
  pdf: createIcon(['M9.5 9h2a2.5 2.5 0 0 1 0 5h-2V9z', 'M13 14h2.5']),
  presentation: PresentationIcon,
  spreadsheet: SpreadsheetIcon,
  terminal: TerminalIcon,
  text: TextIcon,
  vector: VectorIcon,
  video: VideoIcon,
};

export const FolderIcon = createVariantIcon(
  <>
    <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 7V6a2 2 0 0 1 2-2h4l2 2" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </>
);

export function resolveFileIconKey(name: string, mime?: string | null): FileIconKey {
  const normalizedMime = mime?.toLowerCase();
  if (normalizedMime && MIME_ICON_MAP[normalizedMime]) {
    return MIME_ICON_MAP[normalizedMime];
  }
  if (normalizedMime) {
    const prefixMatch = MIME_PREFIX_MAP.find(({ prefix }) => normalizedMime.startsWith(prefix));
    if (prefixMatch) return prefixMatch.icon;
  }

  const lower = name.toLowerCase();
  const parts = lower.split('.');
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const candidate = parts.slice(i).join('.');
      if (EXTENSION_ICON_MAP[candidate]) {
        return EXTENSION_ICON_MAP[candidate];
      }
    }
  }

  return FALLBACK_ICON_KEY;
}

export function getFileIconComponent(key?: string) {
  const normalized = (key as FileIconKey) ?? FALLBACK_ICON_KEY;
  return FILE_ICON_COMPONENTS[normalized] ?? FILE_ICON_COMPONENTS[FALLBACK_ICON_KEY];
}
