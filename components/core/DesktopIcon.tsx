"use client";

import Image from 'next/image';
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSettings } from '../../hooks/useSettings';
import { pickTextColor } from '../../utils/color/contrast';
import { useHideLabelsWhenTidySetting } from '../../utils/settings/desktop';

type DesktopIconProps = {
  id: string;
  icon: string;
  label: string;
  disabled?: boolean;
  launching?: boolean;
  dragging?: boolean;
  snapEnabled?: boolean;
  onActivate: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onPrefetch?: () => void;
};

type Swatch = {
  hex: string;
};

const wallpaperSwatchCache = new Map<string, Swatch>();
const wallpaperPromises = new Map<string, Promise<Swatch | null>>();

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });

const sampleImage = async (img: HTMLImageElement): Promise<string | null> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  try {
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let r = 0;
    let g = 0;
    let b = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    if (!pixels) return null;
    return rgbToHex(
      Math.round(r / pixels),
      Math.round(g / pixels),
      Math.round(b / pixels),
    );
  } catch {
    return null;
  }
};

const fetchSwatch = async (wallpaper: string): Promise<Swatch | null> => {
  if (wallpaperSwatchCache.has(wallpaper)) {
    return wallpaperSwatchCache.get(wallpaper)!;
  }
  if (wallpaperPromises.has(wallpaper)) {
    return wallpaperPromises.get(wallpaper)!;
  }
  const url = `/wallpapers/${wallpaper}.webp`;
  const promise = loadImage(url)
    .then(sampleImage)
    .then((hex) => {
      if (!hex) return null;
      const swatch = { hex };
      wallpaperSwatchCache.set(wallpaper, swatch);
      return swatch;
    })
    .catch(() => null)
    .finally(() => {
      wallpaperPromises.delete(wallpaper);
    });
  wallpaperPromises.set(wallpaper, promise);
  return promise;
};

const useWallpaperSwatch = (wallpaper: string): Swatch | null => {
  const [swatch, setSwatch] = useState<Swatch | null>(() =>
    typeof window === 'undefined'
      ? null
      : wallpaperSwatchCache.get(wallpaper) ?? null,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let cancelled = false;
    const cached = wallpaperSwatchCache.get(wallpaper);
    if (cached) {
      setSwatch(cached);
      return undefined;
    }
    fetchSwatch(wallpaper).then((value) => {
      if (cancelled || !value) return;
      setSwatch(value);
    });
    return () => {
      cancelled = true;
    };
  }, [wallpaper]);

  return swatch;
};

const buildLabelStyle = (hex: string) => {
  const { color, ratio, isAccessible } = pickTextColor(hex);
  const shadowBase =
    color === '#ffffff'
      ? '0 1px 3px rgba(0,0,0,0.7)'
      : '0 1px 3px rgba(255,255,255,0.5)';
  if (isAccessible) {
    return {
      color,
      textShadow: shadowBase,
    } as const;
  }
  const backdrop =
    color === '#ffffff'
      ? 'rgba(0, 0, 0, 0.55)'
      : 'rgba(255, 255, 255, 0.65)';
  const outline =
    color === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.25)';
  return {
    color,
    textShadow: shadowBase,
    backgroundColor: backdrop,
    borderRadius: '0.5rem',
    padding: '0.2rem 0.4rem',
    boxShadow: `0 0 0 1px ${outline}`,
    backdropFilter: 'blur(6px)',
  } as const;
};

const DEFAULT_SWATCH = '#10141a';

const DesktopIcon = ({
  id,
  icon,
  label,
  disabled = false,
  launching = false,
  dragging = false,
  snapEnabled = false,
  onActivate,
  onDragStart,
  onDragEnd,
  onPrefetch,
}: DesktopIconProps) => {
  const { wallpaper } = useSettings();
  const [hideLabelsWhenTidy] = useHideLabelsWhenTidySetting();
  const swatch = useWallpaperSwatch(wallpaper);
  const labelStyles = useMemo(
    () => buildLabelStyle(swatch?.hex ?? DEFAULT_SWATCH),
    [swatch?.hex],
  );

  const hidden = hideLabelsWhenTidy && snapEnabled;

  const handleActivate = useCallback(() => {
    if (disabled) return;
    onActivate();
  }, [disabled, onActivate]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleActivate();
      }
    },
    [handleActivate],
  );

  const handlePrefetch = useCallback(() => {
    if (onPrefetch) onPrefetch();
  }, [onPrefetch]);

  const className = [
    launching ? 'app-icon-launch' : '',
    dragging ? 'opacity-70' : '',
    'p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      data-context="app"
      data-app-id={id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={className}
      id={`app-${id}`}
      onDoubleClick={handleActivate}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      title={label}
    >
      <Image
        width={40}
        height={40}
        className="mb-1 w-10"
        src={icon.replace('./', '/')}
        alt={`Kali ${label}`}
        sizes="40px"
        priority={false}
      />
      {hidden ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span
          className="mt-1 text-xs font-medium leading-tight text-center break-words"
          style={labelStyles as Record<string, string | number>}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default DesktopIcon;
