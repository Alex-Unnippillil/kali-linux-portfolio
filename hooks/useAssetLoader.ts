import { useEffect, useRef, useState } from 'react';
import { createCancelScope, type CancelScope } from '../utils/cancel';

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

  const scopeRef = useRef<CancelScope | null>(null);

  useEffect(() => {
    let unmounted = false;
    if (scopeRef.current) {
      scopeRef.current.abort({ message: 'restart asset load' });
      scopeRef.current.dispose();
    }
    const cancelScope = createCancelScope('useAssetLoader', {
      meta: { images: images.length, sounds: sounds.length },
    });
    scopeRef.current = cancelScope;

    const removeAbort = cancelScope.onAbort(() => {
      if (!unmounted) {
        setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      }
    });

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
        if (!cancelScope.signal.aborted) setState({ loading: false, error: false });
      })
      .catch(() => {
        if (!cancelScope.signal.aborted) setState({ loading: false, error: true });
      });

    return () => {
      unmounted = true;
      removeAbort();
      cancelScope.abort({ message: 'asset loader cleanup' });
      cancelScope.dispose();
    };
  }, [images, sounds]);

  return state;
}
