import { memo, SVGProps, useEffect, useId, useMemo, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

const SPRITE_URL = '/icons/sprite.svg';
const MANIFEST_URL = '/icons/sprite-manifest.json';
const DEFAULT_VIEWBOX = '0 0 24 24';

interface IconManifestEntry {
  id: string;
  viewBox: string;
  hasHighContrast: boolean;
  highContrastId?: string;
}

interface IconManifest {
  generatedAt: string;
  icons: Record<string, IconManifestEntry | undefined>;
}

interface ManifestState {
  data: IconManifest | null;
  promise: Promise<IconManifest> | null;
}

const manifestState: ManifestState = {
  data: null,
  promise: null,
};

const fetchManifest = async (): Promise<IconManifest> => {
  if (manifestState.data) {
    return manifestState.data;
  }
  if (!manifestState.promise) {
    manifestState.promise = fetch(MANIFEST_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load icon manifest: ${response.status} ${response.statusText}`);
        }
        return response.json() as Promise<IconManifest>;
      })
      .then((manifest) => {
        manifestState.data = manifest;
        return manifest;
      })
      .catch((error) => {
        manifestState.promise = null;
        throw error;
      });
  }

  return manifestState.promise;
};

const getSymbolId = (
  entry: IconManifestEntry | undefined,
  name: string,
  requestHighContrast: boolean,
): string => {
  if (requestHighContrast && entry?.highContrastId) {
    return entry.highContrastId;
  }
  if (entry?.id) {
    return entry.id;
  }
  return `icon-${name}`;
};

export type IconVariant = 'auto' | 'regular' | 'high-contrast';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  /** The symbol name generated from the SVG filename (e.g. "terminal"). */
  name: string;
  /** Whether the icon is purely decorative. When true, aria-hidden is set. */
  decorative?: boolean;
  /** Forces a specific variant regardless of global settings. */
  variant?: IconVariant;
  /** Optional accessible title when decorative is false. */
  title?: string;
}

const IconComponent = ({
  name,
  decorative = true,
  variant = 'auto',
  title,
  ...svgProps
}: IconProps) => {
  const { highContrast } = useSettings();
  const [manifest, setManifest] = useState<IconManifest | null>(() => manifestState.data);
  const titleId = useId();

  useEffect(() => {
    if (manifestState.data) {
      setManifest(manifestState.data);
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    fetchManifest()
      .then((data) => {
        setManifest(data);
      })
      .catch((error) => {
        console.warn('[Icon] Failed to load sprite manifest', error);
      });
  }, []);

  useEffect(() => {
    if (!manifest || manifest.icons?.[name]) {
      return;
    }
    console.warn(`[Icon] Icon "${name}" was not found in the sprite manifest.`);
  }, [manifest, name]);

  const entry = manifest?.icons?.[name];
  const prefersHighContrast = useMemo(() => {
    if (variant === 'high-contrast') return true;
    if (variant === 'regular') return false;
    return Boolean(highContrast && entry?.hasHighContrast);
  }, [entry?.hasHighContrast, highContrast, variant]);

  const viewBox = entry?.viewBox ?? DEFAULT_VIEWBOX;
  const symbolId = getSymbolId(entry, name, prefersHighContrast);
  const href = `${SPRITE_URL}#${symbolId}`;

  return (
    <svg
      {...svgProps}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={!decorative && title ? titleId : undefined}
      focusable="false"
      viewBox={viewBox}
      data-icon-name={name}
    >
      {!decorative && title ? <title id={titleId}>{title}</title> : null}
      <use href={href} xlinkHref={href} />
    </svg>
  );
};

export const Icon = memo(IconComponent);
export default Icon;
