"use client";

import { useEffect, useRef } from "react";

const COPY_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M3 5a2 2 0 0 1 2-2h7a1 1 0 1 1 0 2H5v12h7a1 1 0 1 1 0 2H5a2 2 0 0 1-2-2zm7-1a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2zm2 0v12h7V4z"/></svg>';

const slugify = (value: string) => {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const FALLBACK_SLUG = "section";

export interface DocsRendererProps {
  html: string;
  onAnchorClick?: (slug: string) => void;
  onAnchorsRendered?: (slugs: string[]) => void;
}

export default function DocsRenderer({
  html,
  onAnchorClick,
  onAnchorsRendered,
}: DocsRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cleanupHandlers: Array<() => void> = [];
    const slugCounts = new Map<string, number>();
    const renderedAnchors: string[] = [];

    const headings = Array.from(
      container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")
    );

    headings.forEach((heading) => {
      const existingButton = heading.querySelector<HTMLButtonElement>(
        "button[data-docs-anchor]"
      );
      if (existingButton) {
        existingButton.remove();
      }

      const textContent = heading.textContent?.trim() ?? "";
      if (!textContent) {
        return;
      }

      const baseSlug = slugify(textContent) || FALLBACK_SLUG;
      const duplicateCount = slugCounts.get(baseSlug) ?? 0;
      const slug = duplicateCount === 0 ? baseSlug : `${baseSlug}-${duplicateCount + 1}`;
      slugCounts.set(baseSlug, duplicateCount + 1);
      heading.id = slug;
      heading.classList.add("group", "relative");
      renderedAnchors.push(slug);

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-docs-anchor", slug);
      button.setAttribute("aria-label", `Copy link to ${textContent}`);
      button.setAttribute(
        "class",
        "ml-2 inline-flex items-center rounded p-1 text-slate-400 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 group-hover:opacity-100 hover:text-slate-200 opacity-0 focus:opacity-100"
      );
      button.innerHTML = COPY_ICON_SVG;

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onAnchorClick?.(slug);
      };

      button.addEventListener("click", handleClick);
      cleanupHandlers.push(() => {
        button.removeEventListener("click", handleClick);
      });

      heading.appendChild(button);
    });

    onAnchorsRendered?.(renderedAnchors);

    return () => {
      cleanupHandlers.forEach((cleanup) => cleanup());
    };
  }, [html, onAnchorClick, onAnchorsRendered]);

  return (
    <div
      ref={containerRef}
      className="docs-renderer prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
