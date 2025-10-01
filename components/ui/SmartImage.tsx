"use client";

import React, { useEffect, useMemo, useState } from "react";

type ImageImportance = "critical" | "standard" | "low";

export interface SmartImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "loading" | "sizes"> {
  /**
   * Relative importance of the image for paint.
   * `critical` will request high priority and eager loading.
   */
  importance?: ImageImportance;
  /**
   * Marks the image as the expected Largest Contentful Paint target.
   */
  lcp?: boolean;
  /**
   * Custom responsive sizes definition. If omitted, a viewport-aware fallback is used.
   */
  sizes?: string;
  /**
   * Override loading behaviour. Defaults to heuristics derived from priority and viewport.
   */
  loading?: "eager" | "lazy";
}

type ViewportBucket = "mobile" | "desktop" | "unknown";

const MOBILE_BREAKPOINT = 768;
const DEFAULT_SIZES = "(max-width: 1280px) 60vw, 40vw";
const CRITICAL_DESKTOP_SIZES = "(max-width: 1280px) 70vw, 50vw";
const STANDARD_DESKTOP_SIZES = "(max-width: 1280px) 45vw, 30vw";

const clampImportance = (value?: ImageImportance): ImageImportance => {
  if (value === "critical" || value === "low") return value;
  return "standard";
};

const SmartImage: React.FC<SmartImageProps> = ({
  importance = "standard",
  lcp = false,
  sizes,
  loading,
  fetchPriority,
  decoding,
  className,
  src,
  alt = "",
  width,
  height,
  ...rest
}) => {
  const [viewport, setViewport] = useState<ViewportBucket>("unknown");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const computeBucket = () =>
      window.innerWidth <= MOBILE_BREAKPOINT ? "mobile" : "desktop";
    setViewport(computeBucket());
    const handleResize = () => setViewport(computeBucket());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normalizedImportance = clampImportance(importance);

  const resolvedFetchPriority = useMemo<"high" | "low" | "auto">(() => {
    if (fetchPriority) {
      return fetchPriority as "high" | "low" | "auto";
    }
    if (lcp || normalizedImportance === "critical") {
      return "high";
    }
    if (normalizedImportance === "low") {
      return "low";
    }
    if (viewport === "mobile" && (typeof width === "number" ? width : Number(width)) >= 960) {
      return "high";
    }
    return "auto";
  }, [fetchPriority, lcp, normalizedImportance, viewport, width]);

  const resolvedLoading = useMemo<"eager" | "lazy">(() => {
    if (loading) return loading;
    return resolvedFetchPriority === "high" ? "eager" : "lazy";
  }, [loading, resolvedFetchPriority]);

  const resolvedSizes = useMemo(() => {
    if (sizes) return sizes;
    if (viewport === "mobile") {
      return "100vw";
    }
    if (viewport === "desktop") {
      if (lcp || normalizedImportance === "critical") {
        return CRITICAL_DESKTOP_SIZES;
      }
      if (normalizedImportance === "low") {
        return STANDARD_DESKTOP_SIZES;
      }
      return DEFAULT_SIZES;
    }
    return DEFAULT_SIZES;
  }, [sizes, viewport, lcp, normalizedImportance]);

  const resolvedDecoding = decoding || "async";

  return (
    <img
      src={src}
      className={className}
      width={width}
      height={height}
      alt={alt}
      data-lcp-image={lcp ? "true" : undefined}
      loading={resolvedLoading}
      fetchPriority={resolvedFetchPriority === "auto" ? undefined : resolvedFetchPriority}
      sizes={resolvedSizes}
      decoding={resolvedDecoding}
      {...rest}
    />
  );
};

export default SmartImage;
