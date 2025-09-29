import { memo, type SVGProps } from 'react';

const SPRITE_URL = '/themes/icon-sprite.svg';

const ICON_METADATA = {
  'window-close-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
  'window-minimize-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
  'window-maximize-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
  'window-restore-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
  'window-pin-symbolic': { viewBox: '0 0 24 24', defaultSize: 16 },
  'view-app-grid-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
  projects: { viewBox: '0 0 16 16', defaultSize: 16 },
  'process-working-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
  'radar-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
  nessus: { viewBox: '0 0 100 100', defaultSize: 24 },
  http: { viewBox: '0 0 64 64', defaultSize: 24 },
  john: { viewBox: '0 0 64 64', defaultSize: 24 },
  'network-wireless-signal-good-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
  metasploit: { viewBox: '0 0 64 64', defaultSize: 24 },
  ettercap: { viewBox: '0 0 64 64', defaultSize: 24 },
  'msf-post': { viewBox: '0 0 64 64', defaultSize: 24 },
  autopsy: { viewBox: '0 0 64 64', defaultSize: 24 },
  'information-gathering': { viewBox: '0 0 32 32', defaultSize: 20 },
  'vulnerability-analysis': { viewBox: '0 0 32 32', defaultSize: 20 },
  'web-application-analysis': { viewBox: '0 0 32 32', defaultSize: 20 },
  'database-assessment': { viewBox: '0 0 32 32', defaultSize: 20 },
  'password-attacks': { viewBox: '0 0 32 32', defaultSize: 20 },
  'wireless-attacks': { viewBox: '0 0 32 32', defaultSize: 20 },
  'reverse-engineering': { viewBox: '0 0 32 32', defaultSize: 20 },
  'exploitation-tools': { viewBox: '0 0 32 32', defaultSize: 20 },
  'sniffing-spoofing': { viewBox: '0 0 32 32', defaultSize: 20 },
  'post-exploitation': { viewBox: '0 0 32 32', defaultSize: 20 },
  forensics: { viewBox: '0 0 32 32', defaultSize: 20 },
  reporting: { viewBox: '0 0 32 32', defaultSize: 20 },
  'social-engineering': { viewBox: '0 0 32 32', defaultSize: 20 },
  'hardware-hacking': { viewBox: '0 0 32 32', defaultSize: 20 },
  extra: { viewBox: '0 0 32 32', defaultSize: 20 },
  top10: { viewBox: '0 0 32 32', defaultSize: 20 },
  'user-home': { viewBox: '0 0 64 64', defaultSize: 28 },
  'user-desktop': { viewBox: '0 0 64 64', defaultSize: 28 },
  'folder-documents': { viewBox: '0 0 64 64', defaultSize: 28 },
  'folder-downloads': { viewBox: '0 0 64 64', defaultSize: 28 },
  'folder-music': { viewBox: '0 0 64 64', defaultSize: 28 },
  'folder-pictures': { viewBox: '0 0 64 64', defaultSize: 28 },
  'folder-videos': { viewBox: '0 0 64 64', defaultSize: 28 },
  'user-trash': { viewBox: '0 0 64 64', defaultSize: 28 },
  'user-trash-full': { viewBox: '0 0 64 64', defaultSize: 28 },
  'preferences-system-symbolic': { viewBox: '0 0 16 16', defaultSize: 20 },
  'decompiler-symbolic': { viewBox: '0 0 16 16', defaultSize: 16 },
} as const;

export type IconName = keyof typeof ICON_METADATA;

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  name: IconName;
  label?: string;
  size?: number;
  spriteUrl?: string;
};

const IconComponent = ({
  name,
  label,
  size,
  spriteUrl = SPRITE_URL,
  className,
  ...svgProps
}: IconProps) => {
  const metadata = ICON_METADATA[name];
  const finalSize = size ?? metadata?.defaultSize ?? 16;
  const classes = ['inline-block', className].filter(Boolean).join(' ') || undefined;
  const accessibilityProps = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };

  return (
    <svg
      {...svgProps}
      {...accessibilityProps}
      width={finalSize}
      height={finalSize}
      viewBox={metadata?.viewBox ?? '0 0 16 16'}
      focusable="false"
      className={classes}
    >
      {label ? <title>{label}</title> : null}
      <use href={`${spriteUrl}#${name}`} />
    </svg>
  );
};

export const Icon = memo(IconComponent);
export const ICON_SPRITE_URL = SPRITE_URL;
export const ICON_NAMES = Object.keys(ICON_METADATA) as IconName[];
export type { IconName as IconId };
