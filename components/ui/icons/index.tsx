import React from 'react';
import manifestData from './manifest.json';

export type IconName =
  | 'CloseIcon'
  | 'MinimizeIcon'
  | 'MaximizeIcon'
  | 'RestoreIcon'
  | 'PinIcon'
  | 'WifiIcon'
  | 'WifiOffIcon'
  | 'VolumeIcon'
  | 'BatteryIcon'
  | 'DownloadIcon'
  | 'InfoIcon'
  | 'GridIcon'
  | 'BranchIcon'
  | 'CheckIcon'
  | 'FolderIcon';

type PathDefinition = {
  d: string;
  stroke?: string;
  fill?: string;
  strokeLinecap?: 'round' | 'butt' | 'square' | 'inherit';
  strokeLinejoin?: 'round' | 'bevel' | 'miter' | 'inherit';
  strokeWidth?: number;
};

type CircleDefinition = {
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
};

type LineDefinition = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeLinecap?: 'round' | 'butt' | 'square' | 'inherit';
  strokeLinejoin?: 'round' | 'bevel' | 'miter' | 'inherit';
  strokeWidth?: number;
};

export interface IconDefinition {
  name: IconName;
  title?: string;
  paths?: PathDefinition[];
  circles?: CircleDefinition[];
  lines?: LineDefinition[];
}

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  title?: string;
}

const manifest = manifestData as IconDefinition[];

const iconComponents = {} as Record<IconName, React.FC<IconProps>>;

manifest.forEach((definition) => {
  const IconComponent: React.FC<IconProps> = ({
    size = 24,
    title,
    strokeWidth,
    children,
    ...rest
  }) => {
    const resolvedTitle = title ?? definition.title;
    const ariaHidden =
      resolvedTitle || rest['aria-label'] || rest['aria-labelledby'] ? undefined : true;

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth ?? 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-hidden={ariaHidden}
        {...rest}
      >
        {resolvedTitle ? <title>{resolvedTitle}</title> : null}
        {definition.paths?.map((path, idx) => (
          <path key={`path-${idx}`} {...path} />
        ))}
        {definition.lines?.map((line, idx) => (
          <line key={`line-${idx}`} {...line} />
        ))}
        {definition.circles?.map((circle, idx) => (
          <circle key={`circle-${idx}`} {...circle} />
        ))}
        {children}
      </svg>
    );
  };

  IconComponent.displayName = definition.name;
  iconComponents[definition.name] = IconComponent;
});

export const CloseIcon = iconComponents.CloseIcon;
export const MinimizeIcon = iconComponents.MinimizeIcon;
export const MaximizeIcon = iconComponents.MaximizeIcon;
export const RestoreIcon = iconComponents.RestoreIcon;
export const PinIcon = iconComponents.PinIcon;
export const WifiIcon = iconComponents.WifiIcon;
export const WifiOffIcon = iconComponents.WifiOffIcon;
export const VolumeIcon = iconComponents.VolumeIcon;
export const BatteryIcon = iconComponents.BatteryIcon;
export const DownloadIcon = iconComponents.DownloadIcon;
export const InfoIcon = iconComponents.InfoIcon;
export const GridIcon = iconComponents.GridIcon;
export const BranchIcon = iconComponents.BranchIcon;
export const CheckIcon = iconComponents.CheckIcon;
export const FolderIcon = iconComponents.FolderIcon;

export const iconManifest = manifest;
