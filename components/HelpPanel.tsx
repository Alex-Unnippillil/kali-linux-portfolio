"use client";

import { useCallback, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface HelpPanelProps {
  appId: string;
  docPath?: string;
}

interface Section {
  id: string;
  title: string;
  html: string;
}

const headingTags = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export default function HelpPanel({ appId, docPath }: HelpPanelProps) {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading...");

  const createSections = useCallback(
    (markdown: string): Section[] => {
      const rendered = DOMPurify.sanitize(marked.parse(markdown) as string);
      if (!rendered) {
        return [];
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(rendered, "text/html");
      const children = Array.from(doc.body.childNodes);
      const introNodes: Node[] = [];
      const assembledSections: Section[] = [];
      let currentTitle: string | null = null;
      let currentNodes: Node[] = [];
      const slugCounts = new Map<string, number>();

      const addSection = (title: string, nodes: Node[]) => {
        if (!title && !nodes.length) {
          return;
        }

        const wrapper = document.createElement("div");
        nodes.forEach((node) => {
          wrapper.appendChild(node.cloneNode(true));
        });

        const fallbackTitle = title || "Details";
        const baseSlug = slugify(fallbackTitle) || `section-${assembledSections.length + 1}`;
        const slugTotal = slugCounts.get(baseSlug) ?? 0;
        slugCounts.set(baseSlug, slugTotal + 1);
        const uniqueSlug = slugTotal > 0 ? `${baseSlug}-${slugTotal}` : baseSlug;

        const html = wrapper.innerHTML.trim();
        const sanitizedHtml = html ? DOMPurify.sanitize(html) : "<p>No additional details.</p>";

        assembledSections.push({
          id: uniqueSlug,
          title: fallbackTitle,
          html: sanitizedHtml,
        });
      };

      children.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE && headingTags.has((child as Element).tagName)) {
          if (!assembledSections.length && introNodes.length) {
            addSection("Overview", introNodes.splice(0, introNodes.length));
          }

          if (currentTitle !== null) {
            addSection(currentTitle, currentNodes.splice(0, currentNodes.length));
          }

          currentTitle = (child.textContent || "").trim();
          currentNodes = [];
          return;
        }

        const target = currentTitle !== null ? currentNodes : introNodes;
        target.push(child.cloneNode(true));
      });

      if (currentTitle !== null) {
        addSection(currentTitle, currentNodes);
      }

      if (!assembledSections.length && introNodes.length) {
        addSection("Overview", introNodes);
      }

      return assembledSections;
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const path = docPath || `/docs/apps/${appId}.md`;
    if (sections.length) {
      return;
    }

    setStatusMessage("Loading...");
    fetch(path)
      .then((res) => (res.ok ? res.text() : ""))
      .then((md) => {
        if (!md) {
          setSections([]);
          setExpandedId(null);
          setStatusMessage("No help available.");
          return;
        }

        const assembled = createSections(md);
        if (!assembled.length) {
          setSections([]);
          setExpandedId(null);
          setStatusMessage("No help available.");
          return;
        }

        setSections(assembled);
        setExpandedId(assembled[0]?.id ?? null);
        setStatusMessage("");
      })
      .catch(() => {
        setSections([]);
        setExpandedId(null);
        setStatusMessage("No help available.");
      });
  }, [open, appId, docPath, createSections, sections.length]);

  useEffect(() => {
    setSections([]);
    setExpandedId(null);
    setStatusMessage("Loading...");
  }, [appId, docPath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggle = () => setOpen((o) => !o);
  const handleSectionToggle = (sectionId: string) => {
    setExpandedId((current) => (current === sectionId ? null : sectionId));
  };

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        aria-expanded={open}
        onClick={toggle}
        className="fixed top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4"
          onClick={toggle}
        >
          <div
            className="bg-white text-black p-4 rounded max-w-md w-full h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {sections.length ? (
              <div className="space-y-3">
                {sections.map((section) => {
                  const isExpanded = expandedId === section.id;
                  const contentId = `help-section-${section.id}`;
                  const buttonId = `help-section-button-${section.id}`;

                  return (
                    <div key={section.id} className="border border-gray-200 rounded">
                      <button
                        id={buttonId}
                        type="button"
                        onClick={() => handleSectionToggle(section.id)}
                        aria-expanded={isExpanded}
                        aria-controls={contentId}
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-semibold focus:outline-none focus:ring"
                      >
                        <span>{section.title}</span>
                        <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
                      </button>
                      <div
                        id={contentId}
                        role="region"
                        aria-labelledby={buttonId}
                        hidden={!isExpanded}
                        aria-hidden={!isExpanded}
                        className="px-3 pb-3 text-sm leading-relaxed"
                      >
                        <div dangerouslySetInnerHTML={{ __html: section.html }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm" role="status">
                {statusMessage || "No help available."}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

