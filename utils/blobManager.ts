import Router from 'next/router';
import { DependencyList, useEffect, useRef, useState } from 'react';

type BlobLike = Blob | MediaSource;

class BlobManager {
  private refCounts = new Map<string, number>();
  private listenersAttached = false;
  private readonly handleGlobalCleanup = () => {
    this.revokeAll();
  };

  register(blob: BlobLike): string {
    const url = URL.createObjectURL(blob);
    this.retain(url);
    this.ensureListeners();
    return url;
  }

  retain(url: string): void {
    const current = this.refCounts.get(url) ?? 0;
    this.refCounts.set(url, current + 1);
    this.ensureListeners();
  }

  release(url: string): void {
    const current = this.refCounts.get(url);
    if (current === undefined) return;

    if (current <= 1) {
      this.refCounts.delete(url);
      URL.revokeObjectURL(url);
    } else {
      this.refCounts.set(url, current - 1);
    }
  }

  revokeAll(): void {
    if (this.refCounts.size === 0) return;
    for (const url of this.refCounts.keys()) {
      URL.revokeObjectURL(url);
    }
    this.refCounts.clear();
  }

  has(url: string): boolean {
    return this.refCounts.has(url);
  }

  get size(): number {
    return this.refCounts.size;
  }

  private ensureListeners(): void {
    if (this.listenersAttached || typeof window === 'undefined') {
      return;
    }
    this.listenersAttached = true;

    window.addEventListener('pagehide', this.handleGlobalCleanup);
    window.addEventListener('beforeunload', this.handleGlobalCleanup);
    window.addEventListener('freeze', this.handleGlobalCleanup);
    window.addEventListener('memorypressure' as any, this.handleGlobalCleanup);

    if (Router?.events?.on) {
      Router.events.on('routeChangeStart', this.handleGlobalCleanup);
    }
  }
}

export const blobManager = new BlobManager();

export function useBlobUrl(
  source: BlobLike | null | undefined,
  deps: DependencyList = [],
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const currentUrl = useRef<string | null>(null);

  useEffect(() => {
    if (currentUrl.current) {
      blobManager.release(currentUrl.current);
      currentUrl.current = null;
    }

    if (!source) {
      setUrl(null);
      return () => {
        if (currentUrl.current) {
          blobManager.release(currentUrl.current);
          currentUrl.current = null;
        }
      };
    }

    const nextUrl = blobManager.register(source);
    currentUrl.current = nextUrl;
    setUrl(nextUrl);

    return () => {
      if (currentUrl.current) {
        blobManager.release(currentUrl.current);
        currentUrl.current = null;
      }
    };
  }, [source, ...deps]);

  return url;
}

export function useBlobManagerScope() {
  const urlsRef = useRef(new Set<string>());

  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => {
        blobManager.release(url);
      });
      urlsRef.current.clear();
    },
    [],
  );

  const register = (blob: BlobLike) => {
    const url = blobManager.register(blob);
    urlsRef.current.add(url);
    return url;
  };

  const release = (url: string) => {
    if (urlsRef.current.has(url)) {
      urlsRef.current.delete(url);
    }
    blobManager.release(url);
  };

  return { register, release };
}
