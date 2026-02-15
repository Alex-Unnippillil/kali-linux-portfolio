import { useState, useEffect } from 'react';

interface AssetLoaderOptions {
  images?: string[];
  sounds?: string[];
}

interface AssetLoaderState {
  loading: boolean;
  error: boolean;
}

/**
 * Preload a list of image and audio assets.  The hook returns loading and
 * error flags so components can render placeholders or fallbacks while assets
 * are being fetched.  If any asset fails to load the hook will report an error.
 */
export default function useAssetLoader(
  { images = [], sounds = [] }: AssetLoaderOptions,
): AssetLoaderState {
  const [state, setState] = useState<AssetLoaderState>({ loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    // Whenever the list of assets changes start a new loading cycle.
    // Reset the state so consumers can show loading indicators again.
    setState({ loading: true, error: false });

    const loadImage = (src: string) => new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });

    const loadSound = (src: string) => new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      // oncanplaythrough fires when enough data has loaded to play the audio
      audio.oncanplaythrough = () => resolve();
      audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
      audio.src = src;
      // Some browsers require calling load() manually for audio elements
      audio.load();
    });

    Promise.all([
      ...images.map(loadImage),
      ...sounds.map(loadSound),
    ])
      .then(() => {
        if (!cancelled) setState({ loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [images, sounds]);

  return state;
}
