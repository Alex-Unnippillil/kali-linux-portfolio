import IconBase, { type IconProps } from './IconBase';

export const CloseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 6 18 18" />
    <path d="M6 18 18 6" />
  </IconBase>
);

export const MinimizeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5 12h14" />
  </IconBase>
);

export const MaximizeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x={5} y={5} width={14} height={14} rx={2} />
  </IconBase>
);

export const RestoreIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M7 17h10a2 2 0 0 0 2-2V7" />
    <path d="M7 17a2 2 0 0 1-2-2V7h10a2 2 0 0 1 2 2" />
  </IconBase>
);

export const PinIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 17v4" />
    <path d="m8.5 3.5 7 7" />
    <path d="M8 7H5l5 5v3l4-4" />
  </IconBase>
);

export const WifiIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 9c4.5-4 11.5-4 16 0" />
    <path d="M6.5 11.5c3-2.6 8-2.6 11 0" />
    <path d="M9 14c1.8-1.6 4.2-1.6 6 0" />
    <circle cx={12} cy={17} r={1} />
  </IconBase>
);

export const WifiOffIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 9c3-2.6 7-3.5 10.6-2.6" />
    <path d="M6.5 11.5a8.1 8.1 0 0 1 3.6-1.9" />
    <path d="M9 14a4.6 4.6 0 0 1 2-.7" />
    <circle cx={12} cy={17} r={1} />
    <path d="m3 3 18 18" />
  </IconBase>
);

export const VolumeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 10v4h3l4 3V7l-4 3H4z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
    <path d="M19 7a7 7 0 0 1 0 10" />
  </IconBase>
);

export const BatteryIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x={4} y={7} width={14} height={10} rx={2} />
    <path d="M20 10h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1" />
    <path d="M8 10h6v4H8z" />
  </IconBase>
);

export const GridIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x={4} y={4} width={5} height={5} rx={1} />
    <rect x={10} y={4} width={5} height={5} rx={1} />
    <rect x={16} y={4} width={4} height={5} rx={1} />
    <rect x={4} y={10} width={5} height={5} rx={1} />
    <rect x={10} y={10} width={5} height={5} rx={1} />
    <rect x={16} y={10} width={4} height={5} rx={1} />
    <rect x={4} y={16} width={5} height={4} rx={1} />
    <rect x={10} y={16} width={5} height={4} rx={1} />
    <rect x={16} y={16} width={4} height={4} rx={1} />
  </IconBase>
);

export const InfoIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx={12} cy={12} r={9} />
    <path d="M12 10v7" />
    <path d="M12 7h.01" />
  </IconBase>
);

export const DownloadIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 19h16" />
  </IconBase>
);

export const RefreshIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M20 5v6h-6" />
    <path d="M4 19v-6h6" />
    <path d="M5.1 9A7 7 0 0 1 19 7.3" />
    <path d="M18.9 15A7 7 0 0 1 5 16.7" />
  </IconBase>
);

export const FolderIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </IconBase>
);

export const GraduationCapIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3 9 12 5l9 4-9 4-9-4Z" />
    <path d="M7 11v3a5 5 0 0 0 10 0v-3" />
    <path d="M12 13v6" />
    <path d="M19 10v4" />
    <circle cx={19} cy={15} r={1} />
  </IconBase>
);

export const ShieldCheckIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 21c5-2 7-5 7-9V6l-7-3-7 3v6c0 4 2 7 7 9Z" />
    <path d="m9 11 2.5 2.5L15 9" />
  </IconBase>
);

export const SparklesIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 4 13.7 8.7 18.5 10.4 13.7 12.1 12 16.8 10.3 12.1 5.5 10.4 10.3 8.7Z" />
    <path d="M5 5.4 5.7 7 7.3 7.7 5.7 8.4 5 10 4.3 8.4 2.7 7.7 4.3 7Z" />
    <path d="M18.5 14.2 19 15.6 20.4 16.1 19 16.6 18.5 18 18 16.6 16.6 16.1 18 15.6Z" />
  </IconBase>
);

export const CheckIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5 13l4 4L19 7" />
  </IconBase>
);

export const BranchIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx={6} cy={6} r={2} />
    <circle cx={6} cy={18} r={2} />
    <circle cx={18} cy={8} r={2} />
    <path d="M6 8v8a4 4 0 0 0 4 4h2" />
    <path d="M8 6h6a4 4 0 0 1 4 4v2" />
  </IconBase>
);

export const UndoIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M9 15 4 10l5-5" />
    <path d="M4 10h11a4 4 0 0 1 0 8h-2" />
  </IconBase>
);

export const ChevronDownIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m6 9 6 6 6-6" />
  </IconBase>
);
