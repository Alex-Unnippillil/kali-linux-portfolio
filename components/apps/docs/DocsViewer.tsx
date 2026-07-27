"use client";

import { useCallback, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

import DocsRenderer from "./DocsRenderer";

interface DocsViewerProps {
  markdown: string;
  className?: string;
}

const fallbackCopy = (value: string) => {
  if (typeof document === "undefined") return;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (typeof document.execCommand === "function") {
      document.execCommand("copy");
    }
  } catch (error) {
    // Ignore failures; clipboard access is best-effort.
  } finally {
    document.body.removeChild(textarea);
  }
};

const buildUrlWithHash = (slug: string) => {
  if (typeof window === "undefined") {
    return `#${slug}`;
  }
  return `${window.location.origin}${window.location.pathname}#${slug}`;
};

const scrollToAnchor = (target: string) => {
  if (typeof document === "undefined") return;
  const id = target.startsWith("#") ? target.slice(1) : target;
  if (!id) return;
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

export default function DocsViewer({ markdown, className }: DocsViewerProps) {
  const html = useMemo(() => {
    const parsed = marked.parse(markdown) as string;
    return DOMPurify.sanitize(parsed);
  }, [markdown]);

  const handleAnchorClick = useCallback((slug: string) => {
    const url = buildUrlWithHash(slug);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }

    if (typeof window !== "undefined") {
      const hashValue = `#${slug}`;
      if (typeof history !== "undefined") {
        try {
          history.replaceState(null, "", `${window.location.pathname}${hashValue}`);
        } catch (error) {
          window.location.hash = hashValue;
        }
      } else {
        window.location.hash = hashValue;
      }

      if (window.location.hash !== hashValue) {
        window.location.hash = hashValue;
      }
    }

    scrollToAnchor(slug);
  }, []);

  const handleAnchorsRendered = useCallback((slugs: string[]) => {
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.slice(1);
    if (!currentHash) return;
    if (slugs.includes(currentHash)) {
      scrollToAnchor(currentHash);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHashChange = () => {
      if (window.location.hash) {
        scrollToAnchor(window.location.hash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return (
    <div className={`docs-viewer overflow-y-auto p-4 ${className ?? ""}`.trim()}>
      <DocsRenderer
        html={html}
        onAnchorClick={handleAnchorClick}
        onAnchorsRendered={handleAnchorsRendered}
      />
    </div>
  );
}
