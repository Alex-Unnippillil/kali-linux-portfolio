import React, { createContext, useCallback, useMemo, useState } from "react";
import windowStyles from "../base/window.module.css";
import type { SnapPosition, SnapRect } from "../../utils/windowSnap";

type SnapPreviewPayload = {
  rect: SnapRect;
  label: string;
  ownerWindowId?: string | null;
  position?: SnapPosition | null;
};

type SnapOverlayContextValue = {
  showPreview: (payload: SnapPreviewPayload) => void;
  hidePreview: (ownerWindowId?: string | null) => void;
};

const defaultContextValue: SnapOverlayContextValue = {
  showPreview: () => {},
  hidePreview: () => {},
};

export const SnapOverlayContext = createContext<SnapOverlayContextValue>(defaultContextValue);

const SnapOverlay = ({ preview }: { preview: SnapPreviewPayload | null }) => {
  if (!preview) return null;

  return (
    <div
      data-testid="snap-preview"
      className={`fixed pointer-events-none z-40 transition-opacity ${windowStyles.snapPreview} ${windowStyles.snapPreviewGlass}`}
      style={{
        left: `${preview.rect.left}px`,
        top: `${preview.rect.top}px`,
        width: `${preview.rect.width}px`,
        height: `${preview.rect.height}px`,
        backdropFilter: "brightness(1.1) saturate(1.2)",
        WebkitBackdropFilter: "brightness(1.1) saturate(1.2)",
      }}
      aria-live="polite"
      aria-label={preview.label}
      role="status"
    >
      <span className={windowStyles.snapPreviewLabel} aria-hidden="true">
        {preview.label}
      </span>
    </div>
  );
};

export const SnapOverlayProvider = ({ children }: { children: React.ReactNode }) => {
  const [preview, setPreview] = useState<SnapPreviewPayload | null>(null);

  const showPreview = useCallback((payload: SnapPreviewPayload) => {
    setPreview((current) => {
      if (
        current &&
        current.label === payload.label &&
        current.ownerWindowId === payload.ownerWindowId &&
        current.rect.left === payload.rect.left &&
        current.rect.top === payload.rect.top &&
        current.rect.width === payload.rect.width &&
        current.rect.height === payload.rect.height
      ) {
        return current;
      }
      return payload;
    });
  }, []);

  const hidePreview = useCallback((ownerWindowId?: string | null) => {
    setPreview((current) => {
      if (!current) return current;
      if (ownerWindowId && current.ownerWindowId && current.ownerWindowId !== ownerWindowId) {
        return current;
      }
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({
      showPreview,
      hidePreview,
    }),
    [showPreview, hidePreview],
  );

  return (
    <SnapOverlayContext.Provider value={value}>
      {children}
      <SnapOverlay preview={preview} />
    </SnapOverlayContext.Provider>
  );
};
