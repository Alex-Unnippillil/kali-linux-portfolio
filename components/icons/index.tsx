import React from 'react';

export type IconSize = 16 | 20 | 24 | 32;

const COLORS = {
  midnight: '#0F172A',
  slate: '#1F2937',
  electric: '#38BDF8',
  mint: '#10B981',
  amber: '#F59E0B',
  magenta: '#EC4899',
  white: '#FFFFFF',
};

const ALLOWED_SIZES: IconSize[] = [16, 20, 24, 32];

const isIconSize = (value: number): value is IconSize =>
  ALLOWED_SIZES.includes(value as IconSize);

export const normalizeIconSize = (value?: number): IconSize =>
  value && isIconSize(value) ? (value as IconSize) : 32;

type FrameProps = {
  size: IconSize;
  title?: string;
  className?: string;
  background?: string;
  cornerRadius?: number;
  borderColor?: string;
  children: React.ReactNode;
};

const IconFrame: React.FC<FrameProps> = ({
  size,
  title,
  className,
  background = COLORS.midnight,
  cornerRadius = 6,
  borderColor,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    role="img"
    aria-hidden={title ? undefined : true}
    className={className}
    focusable="false"
  >
    {title ? <title>{title}</title> : null}
    <rect
      x={2}
      y={2}
      width={28}
      height={28}
      rx={cornerRadius}
      fill={background}
      stroke={borderColor ?? 'none'}
      strokeWidth={borderColor ? 2 : 0}
    />
    {children}
  </svg>
);

type GlyphProps = {
  size: IconSize;
  title?: string;
  className?: string;
};

type GlyphComponent = React.FC<GlyphProps>;

const AppGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.slate}>
    <rect x={6} y={6} width={8} height={8} rx={2} fill={COLORS.midnight} />
    <rect x={18} y={6} width={8} height={8} rx={2} fill={COLORS.midnight} />
    <rect x={6} y={18} width={8} height={8} rx={2} fill={COLORS.midnight} />
    <rect x={18} y={18} width={8} height={8} rx={2} fill={COLORS.electric} />
  </IconFrame>
);

const TerminalGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path
      d="M8 10 L14 16 L8 22"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1={16}
      y1={22}
      x2={24}
      y2={22}
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </IconFrame>
);

const BrowserGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <circle
      cx={16}
      cy={16}
      r={9}
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
    />
    <path
      d="M7 16 H25"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <path
      d="M16 7 C12 11 12 21 16 25 C20 21 20 11 16 7 Z"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </IconFrame>
);

const CodeGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <polyline
      points="10 10 6 16 10 22"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="22 10 26 16 22 22"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1={14}
      y1={10}
      x2={18}
      y2={22}
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </IconFrame>
);

const NotebookGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.slate}>
    <rect x={9} y={7} width={14} height={18} rx={4} fill={COLORS.midnight} />
    <line x1={11} y1={12} x2={21} y2={12} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={11} y1={16} x2={21} y2={16} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={11} y1={20} x2={21} y2={20} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <rect x={7} y={7} width={2} height={18} fill={COLORS.electric} rx={1} />
  </IconFrame>
);

const CalculatorGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={9} y={7} width={14} height={18} rx={4} fill={COLORS.slate} />
    <line x1={12} y1={12} x2={20} y2={12} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={16} y1={10} x2={16} y2={14} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={12} y1={18} x2={20} y2={18} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={12} y1={22} x2={20} y2={22} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const CameraGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={6} y={11} width={20} height={12} rx={4} fill={COLORS.slate} />
    <rect x={10} y={7} width={6} height={4} rx={2} fill={COLORS.slate} />
    <circle cx={16} cy={17} r={5} fill="none" stroke={COLORS.electric} strokeWidth={2} />
    <circle cx={16} cy={17} r={2} fill={COLORS.electric} />
  </IconFrame>
);

const CloudGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path
      d="M10 20 H24 C26 20 26 24 24 24 H10 C8 24 6 22 6 20 C6 18 8 16 10 16 C10 12 14 10 17 12 C18 12 22 12 22 16"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconFrame>
);

const DocumentGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path
      d="M10 6 H18 L24 12 V26 H10 Z"
      fill={COLORS.slate}
    />
    <path d="M18 6 V12 H24" fill={COLORS.midnight} />
    <line x1={12} y1={16} x2={22} y2={16} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={12} y1={20} x2={22} y2={20} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const GameArcadeGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={8} y={18} width={16} height={6} rx={3} fill={COLORS.slate} />
    <circle cx={16} cy={16} r={4} fill="none" stroke={COLORS.electric} strokeWidth={2} />
    <rect x={14} y={8} width={4} height={10} rx={2} fill={COLORS.electric} />
    <circle cx={16} cy={10} r={2} fill={COLORS.electric} />
  </IconFrame>
);

const GamePuzzleGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path
      d="M18 8 H22 V12 C24 12 24 16 22 16 C24 16 24 20 22 20 V24 H18 C18 22 14 22 14 24 H10 V20 C8 20 8 16 10 16 C8 16 8 12 10 12 V8 H14 C14 10 18 10 18 8 Z"
      fill={COLORS.electric}
      fillRule="evenodd"
    />
  </IconFrame>
);

const GameCardGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={9} y={9} width={12} height={16} rx={3} fill={COLORS.slate} />
    <rect x={13} y={7} width={12} height={16} rx={3} fill="none" stroke={COLORS.electric} strokeWidth={2} />
    <path d="M16 18 L20 14 L22 16 L18 20 Z" fill={COLORS.electric} />
  </IconFrame>
);

const GameRunnerGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <polyline
      points="6 20 12 14 18 18 24 12"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx={12} cy={14} r={2} fill={COLORS.electric} />
    <circle cx={18} cy={18} r={2} fill={COLORS.electric} />
  </IconFrame>
);

const MusicGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path
      d="M12 10 V22 C12 24 8 24 8 22 C8 20 12 20 12 22 V12 L22 10 V18 C22 20 18 20 18 18 C18 16 22 16 22 18"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconFrame>
);

const VideoGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={8} y={10} width={12} height={12} rx={3} fill={COLORS.slate} />
    <path d="M20 14 L26 12 V20 L20 18 Z" fill={COLORS.electric} />
    <rect x={8} y={8} width={12} height={2} rx={1} fill={COLORS.electric} />
  </IconFrame>
);

const SettingsGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <circle cx={16} cy={16} r={3} fill={COLORS.electric} />
    <path
      d="M16 8 L18 10 L22 10 L23 14 L25 16 L23 18 L22 22 L18 22 L16 24 L14 22 L10 22 L9 18 L7 16 L9 14 L10 10 L14 10 Z"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconFrame>
);

const MonitorGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={6} y={8} width={20} height={14} rx={3} fill={COLORS.slate} />
    <line x1={12} y1={24} x2={20} y2={24} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={16} y1={22} x2={16} y2={26} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const NetworkGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <circle cx={16} cy={12} r={3} fill={COLORS.electric} />
    <circle cx={10} cy={20} r={3} fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} />
    <circle cx={22} cy={20} r={3} fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} />
    <line x1={13} y1={14} x2={11} y2={18} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={19} y1={14} x2={21} y2={18} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const RadarGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <circle cx={16} cy={16} r={9} fill="none" stroke={COLORS.electric} strokeWidth={2} />
    <path d="M16 16 L24 10" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <path d="M12 10 C8 12 8 20 12 22" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" fill="none" />
    <circle cx={24} cy={10} r={2} fill={COLORS.electric} />
  </IconFrame>
);

const ShieldGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path
      d="M16 6 L24 10 V16 C24 21 20 25 16 26 C12 25 8 21 8 16 V10 Z"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M16 10 V20" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const BugGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <ellipse cx={16} cy={16} rx={5} ry={7} fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} />
    <line x1={16} y1={8} x2={16} y2={12} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={10} y1={13} x2={6} y2={11} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={10} y1={19} x2={6} y2={21} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={22} y1={13} x2={26} y2={11} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={22} y1={19} x2={26} y2={21} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const ChipGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={10} y={10} width={12} height={12} rx={3} fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} />
    <rect x={12} y={12} width={8} height={8} rx={2} fill={COLORS.midnight} />
    <line x1={12} y1={8} x2={12} y2={10} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={20} y1={8} x2={20} y2={10} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={12} y1={22} x2={12} y2={24} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={20} y1={22} x2={20} y2={24} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const LockGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={10} y={14} width={12} height={10} rx={3} fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} />
    <path
      d="M12 14 V12 C12 8 20 8 20 12 V14"
      fill="none"
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <circle cx={16} cy={19} r={2} fill={COLORS.electric} />
  </IconFrame>
);

const QRGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={6} y={6} width={8} height={8} fill="none" stroke={COLORS.electric} strokeWidth={2} />
    <rect x={18} y={6} width={8} height={8} fill="none" stroke={COLORS.electric} strokeWidth={2} />
    <rect x={6} y={18} width={8} height={8} fill="none" stroke={COLORS.electric} strokeWidth={2} />
    <rect x={14} y={14} width={4} height={4} fill={COLORS.electric} />
    <rect x={20} y={20} width={4} height={4} fill={COLORS.electric} />
    <rect x={16} y={22} width={2} height={2} fill={COLORS.electric} />
  </IconFrame>
);

const WeatherGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <circle cx={12} cy={14} r={4} fill={COLORS.amber} />
    <path
      d="M10 22 H24 C26 22 26 26 24 26 H12 C8 26 6 24 6 22 C6 20 8 18 11 18 C12 16 14 16 16 17"
      fill="none"
      stroke={COLORS.white}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconFrame>
);

const TimelineGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <line x1={6} y1={16} x2={26} y2={16} stroke={COLORS.slate} strokeWidth={2} strokeLinecap="round" />
    <circle cx={10} cy={16} r={3} fill={COLORS.electric} />
    <circle cx={18} cy={16} r={3} fill={COLORS.mint} />
    <circle cx={24} cy={16} r={2} fill={COLORS.magenta} />
  </IconFrame>
);

const FolderGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.slate}>
    <path
      d="M6 11 H14 L16 14 H26 V24 C26 26 24 26 24 26 H8 C6 26 6 24 6 24 Z"
      fill={COLORS.midnight}
    />
    <path d="M6 14 H26" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const TrashGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={10} y={12} width={12} height={14} rx={3} fill={COLORS.slate} />
    <rect x={12} y={8} width={8} height={4} rx={2} fill={COLORS.slate} />
    <line x1={14} y1={14} x2={14} y2={24} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <line x1={18} y1={14} x2={18} y2={24} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const GraphGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={8} y={18} width={4} height={6} rx={1} fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} />
    <rect x={14} y={14} width={4} height={10} rx={1} fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} />
    <rect x={20} y={10} width={4} height={14} rx={1} fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} />
  </IconFrame>
);

const NoteGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={8} y={8} width={16} height={16} rx={3} fill={COLORS.slate} />
    <path d="M18 8 V16 H24" fill={COLORS.electric} />
    <line x1={10} y1={14} x2={16} y2={14} stroke={COLORS.white} strokeWidth={2} strokeLinecap="round" />
    <line x1={10} y1={18} x2={16} y2={18} stroke={COLORS.white} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const WifiGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path d="M8 16 C12 12 20 12 24 16" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" fill="none" />
    <path d="M10 20 C13 17 19 17 22 20" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" fill="none" />
    <circle cx={16} cy={22} r={2} fill={COLORS.electric} />
  </IconFrame>
);

const DownloadGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <line x1={16} y1={8} x2={16} y2={18} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <polyline points="12 14 16 18 20 14" fill="none" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <rect x={10} y={20} width={12} height={4} rx={2} fill={COLORS.slate} />
  </IconFrame>
);

const MessageGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path
      d="M8 10 H24 V20 H18 L14 24 V20 H8 Z"
      fill={COLORS.slate}
      stroke={COLORS.electric}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  </IconFrame>
);

const GridGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.slate}>
    {[0, 1, 2].map((row) =>
      [0, 1, 2].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={6 + col * 8}
          y={6 + row * 8}
          width={4}
          height={4}
          rx={1}
          fill={row === 2 && col === 2 ? COLORS.electric : COLORS.midnight}
        />
      ))
    )}
  </IconFrame>
);

const ProfileGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <circle cx={16} cy={12} r={4} fill={COLORS.electric} />
    <path d="M10 24 C10 20 22 20 22 24 Z" fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const EducationGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path d="M8 12 L16 8 L24 12 L16 16 Z" fill={COLORS.electric} />
    <path d="M10 18 V13 L16 16 L22 13 V18" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <line x1={16} y1={16} x2={16} y2={22} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const ChecklistGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <rect x={10} y={8} width={12} height={16} rx={3} fill={COLORS.slate} />
    <polyline points="12 12 14 14 18 10" fill="none" stroke={COLORS.mint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <line x1={12} y1={18} x2={20} y2={18} stroke={COLORS.white} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const LabGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path d="M12 8 V14 L8 22 C8 24 10 26 12 26 H20 C22 26 24 24 24 22 L20 14 V8" fill={COLORS.slate} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 18 H20" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
  </IconFrame>
);

const AnalysisGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <circle cx={13} cy={13} r={6} fill="none" stroke={COLORS.electric} strokeWidth={2} />
    <line x1={17} y1={17} x2={24} y2={24} stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" />
    <circle cx={13} cy={13} r={2} fill={COLORS.electric} />
  </IconFrame>
);

const RefreshGlyph: GlyphComponent = (props) => (
  <IconFrame {...props} background={COLORS.midnight}>
    <path d="M12 10 H8 V6" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 10 C10 6 22 6 24 14 C25 18 22 22 18 22" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" fill="none" />
    <polyline points="18 18 18 22 22 22" fill="none" stroke={COLORS.electric} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </IconFrame>
);

export const ICON_COMPONENTS = {
  app: AppGlyph,
  terminal: TerminalGlyph,
  browser: BrowserGlyph,
  code: CodeGlyph,
  notebook: NotebookGlyph,
  calculator: CalculatorGlyph,
  camera: CameraGlyph,
  cloud: CloudGlyph,
  document: DocumentGlyph,
  'game-arcade': GameArcadeGlyph,
  'game-puzzle': GamePuzzleGlyph,
  'game-card': GameCardGlyph,
  'game-runner': GameRunnerGlyph,
  music: MusicGlyph,
  video: VideoGlyph,
  settings: SettingsGlyph,
  monitor: MonitorGlyph,
  network: NetworkGlyph,
  radar: RadarGlyph,
  shield: ShieldGlyph,
  bug: BugGlyph,
  chip: ChipGlyph,
  lock: LockGlyph,
  qr: QRGlyph,
  weather: WeatherGlyph,
  timeline: TimelineGlyph,
  folder: FolderGlyph,
  trash: TrashGlyph,
  graph: GraphGlyph,
  note: NoteGlyph,
  wifi: WifiGlyph,
  download: DownloadGlyph,
  message: MessageGlyph,
  grid: GridGlyph,
  profile: ProfileGlyph,
  education: EducationGlyph,
  checklist: ChecklistGlyph,
  lab: LabGlyph,
  analysis: AnalysisGlyph,
  refresh: RefreshGlyph,
} as const;

export type IconName = keyof typeof ICON_COMPONENTS;
export const DEFAULT_ICON_NAME: IconName = 'app';

export const isIconName = (name: string): name is IconName =>
  Object.prototype.hasOwnProperty.call(ICON_COMPONENTS, name);

export const resolveIconName = (name?: string): IconName => {
  if (!name) return DEFAULT_ICON_NAME;
  const normalized = name.toLowerCase();
  return isIconName(normalized) ? (normalized as IconName) : DEFAULT_ICON_NAME;
};

export interface IconProps {
  name?: string;
  size?: IconSize;
  title?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size, title, className }) => {
  const resolvedName = resolveIconName(name);
  const Glyph = ICON_COMPONENTS[resolvedName];
  const resolvedSize = normalizeIconSize(size);
  return <Glyph size={resolvedSize} title={title} className={className} />;
};

export default Icon;
