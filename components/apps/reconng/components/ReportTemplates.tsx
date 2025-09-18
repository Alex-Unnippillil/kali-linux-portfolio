import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import usePersistentState from '../../../../hooks/usePersistentState';
import defaultTemplates from '../../../../templates/export/report-templates.json';
import type {
  FigureNumberingScheme,
  Finding,
  HeadingInfo,
  ReportTemplate,
  TemplateConfig,
} from './reportProcessing';
import {
  preprocessMarkdown,
  renderTemplate,
  stripMarkdown,
} from './reportProcessing';

const mockFindings: Finding[] = [
  {
    title: 'Open Port 80',
    description: 'HTTP service detected on port 80',
    severity: 'Low',
  },
  {
    title: 'Deprecated TLS Version',
    description: 'Server supports TLS 1.0',
    severity: 'Medium',
  },
  {
    title: 'SQL Injection',
    description: 'User parameter vulnerable to injection',
    severity: 'High',
  },
];

type TemplateMap = Record<string, ReportTemplate>;

type RawBlockType =
  | 'heading'
  | 'paragraph'
  | 'listItem'
  | 'tocItem'
  | 'figure'
  | 'figureCaption'
  | 'blank';

interface RawBlock {
  type: RawBlockType;
  text?: string;
  level?: number;
  slug?: string;
  targetSlug?: string;
  indentLevel?: number;
}

interface RenderBlock {
  type: RawBlockType;
  lines: string[];
  fontSize: number;
  fontStyle: 'normal' | 'bold' | 'italic';
  lineHeight: number;
  afterSpacing: number;
  indent: number;
  slug?: string;
  targetSlug?: string;
  bullet?: boolean;
}

interface HeadingPosition {
  page: number;
  y: number;
}

const numberingLabels: Record<FigureNumberingScheme, string> = {
  arabic: '1, 2, 3',
  roman: 'I, II, III',
  alphabetic: 'A, B, C',
};

const defaultNumberingOptions: FigureNumberingScheme[] = [
  'arabic',
  'roman',
  'alphabetic',
];

const templateToState = (config?: TemplateConfig) => {
  const sectionState: Record<string, boolean> = {};
  (config?.optionalSections || []).forEach((section) => {
    sectionState[section.id] = section.defaultIncluded;
  });
  const numbering =
    config?.figureNumbering?.default ||
    config?.figureNumbering?.options?.[0] ||
    'arabic';
  return { sectionState, numbering };
};

const parseMarkdownBlocks = (
  markdown: string,
  headings: HeadingInfo[],
): RawBlock[] => {
  const lines = markdown.split(/\r?\n/);
  const rawBlocks: RawBlock[] = [];
  let paragraph: string[] = [];
  const headingQueue = [...headings];
  let inToc = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    rawBlocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const heading = headingQueue.shift();
      rawBlocks.push({ type: 'heading', level, text, slug: heading?.slug });
      inToc = text.toLowerCase().includes('table of contents');
      continue;
    }

    const figureMatch = line.match(/^!\[(Figure[^\]]*)\]\(([^)]+)\)/);
    if (figureMatch) {
      flushParagraph();
      rawBlocks.push({
        type: 'figure',
        text: `${figureMatch[1]} (${figureMatch[2]})`,
      });
      continue;
    }

    const captionMatch = line.match(/^(_Figure\s+[^:]+:\s*.+_)$/i);
    if (captionMatch) {
      flushParagraph();
      rawBlocks.push({ type: 'figureCaption', text: captionMatch[1] });
      continue;
    }

    const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      const indentLevel = Math.floor((listMatch[1] || '').length / 2);
      const content = listMatch[2];
      if (inToc) {
        const tocMatch = content.match(/^\[(.+?)\]\(#(.+?)\)/);
        if (tocMatch) {
          rawBlocks.push({
            type: 'tocItem',
            text: tocMatch[1],
            targetSlug: tocMatch[2],
            indentLevel,
          });
          continue;
        }
      }
      rawBlocks.push({
        type: 'listItem',
        text: content,
        indentLevel,
      });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      rawBlocks.push({ type: 'blank' });
      inToc = false;
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return rawBlocks;
};

const buildRenderBlocks = (
  doc: jsPDF,
  blocks: RawBlock[],
  contentWidth: number,
): RenderBlock[] => {
  const renderBlocks: RenderBlock[] = [];
  const baseLineHeight = 16;
  const bulletSpacing = 14;

  blocks.forEach((block) => {
    switch (block.type) {
      case 'heading': {
        const level = block.level || 1;
        const fontSize = level === 1 ? 20 : level === 2 ? 16 : level === 3 ? 14 : 13;
        const lineHeight = Math.round(fontSize * 1.2);
        const text = stripMarkdown(block.text || '');
        renderBlocks.push({
          type: 'heading',
          lines: [text],
          fontSize,
          fontStyle: 'bold',
          lineHeight,
          afterSpacing: level === 1 ? 12 : level === 2 ? 10 : 8,
          indent: 0,
          slug: block.slug,
        });
        break;
      }
      case 'paragraph': {
        const text = stripMarkdown(block.text || '');
        const lines = doc.splitTextToSize(text, contentWidth);
        renderBlocks.push({
          type: 'paragraph',
          lines,
          fontSize: 12,
          fontStyle: 'normal',
          lineHeight: baseLineHeight,
          afterSpacing: 8,
          indent: 0,
        });
        break;
      }
      case 'listItem': {
        const text = stripMarkdown(block.text || '');
        const indent = (block.indentLevel || 0) * bulletSpacing + bulletSpacing;
        const lines = doc.splitTextToSize(text, contentWidth - indent + bulletSpacing);
        renderBlocks.push({
          type: 'listItem',
          lines,
          fontSize: 12,
          fontStyle: 'normal',
          lineHeight: baseLineHeight,
          afterSpacing: 6,
          indent,
          bullet: true,
        });
        break;
      }
      case 'tocItem': {
        const text = stripMarkdown(block.text || '');
        const indent = (block.indentLevel || 0) * bulletSpacing;
        const lines = doc.splitTextToSize(text, contentWidth - indent);
        renderBlocks.push({
          type: 'tocItem',
          lines,
          fontSize: 12,
          fontStyle: 'normal',
          lineHeight: baseLineHeight,
          afterSpacing: 4,
          indent,
          targetSlug: block.targetSlug,
        });
        break;
      }
      case 'figure': {
        const text = stripMarkdown(block.text || '');
        const lines = doc.splitTextToSize(text, contentWidth);
        renderBlocks.push({
          type: 'figure',
          lines,
          fontSize: 12,
          fontStyle: 'italic',
          lineHeight: baseLineHeight,
          afterSpacing: 4,
          indent: 0,
        });
        break;
      }
      case 'figureCaption': {
        const text = stripMarkdown(block.text || '');
        const lines = doc.splitTextToSize(text, contentWidth);
        renderBlocks.push({
          type: 'figureCaption',
          lines,
          fontSize: 11,
          fontStyle: 'italic',
          lineHeight: baseLineHeight,
          afterSpacing: 10,
          indent: bulletSpacing,
        });
        break;
      }
      default: {
        renderBlocks.push({
          type: 'blank',
          lines: [],
          fontSize: 12,
          fontStyle: 'normal',
          lineHeight: baseLineHeight,
          afterSpacing: 8,
          indent: 0,
        });
      }
    }
  });

  return renderBlocks;
};

const measureBlocks = (
  renderBlocks: RenderBlock[],
  margin: number,
  pageHeight: number,
) => {
  let y = margin;
  let page = 1;
  const positions = new Map<string, HeadingPosition>();

  renderBlocks.forEach((block) => {
    const blockHeight = block.lines.length * block.lineHeight;
    if (y + blockHeight > pageHeight - margin) {
      page += 1;
      y = margin;
    }

    if (block.type === 'heading' && block.slug) {
      positions.set(block.slug, { page, y });
    }

    y += blockHeight + block.afterSpacing;
  });

  return positions;
};

const drawBlocks = (
  doc: jsPDF,
  renderBlocks: RenderBlock[],
  margin: number,
  pageHeight: number,
  headingPositions: Map<string, HeadingPosition>,
) => {
  let y = margin;
  const bulletOffset = 10;

  renderBlocks.forEach((block) => {
    const blockHeight = block.lines.length * block.lineHeight;
    if (y + blockHeight > pageHeight - margin && block.lines.length > 0) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', block.fontStyle);
    doc.setFontSize(block.fontSize);

    if (block.lines.length === 0) {
      y += block.afterSpacing;
      return;
    }

    let lineY = y;
    block.lines.forEach((line, index) => {
      const x = margin + block.indent;
      if (block.type === 'listItem') {
        if (index === 0) {
          doc.text('\u2022', x - bulletOffset, lineY);
        }
        doc.text(line, x, lineY);
      } else if (block.type === 'tocItem' && block.targetSlug) {
        const target = headingPositions.get(block.targetSlug);
        if (target) {
          doc.textWithLink(line, x, lineY, {
            pageNumber: target.page,
            top: target.y,
          });
        } else {
          doc.text(line, x, lineY);
        }
      } else {
        doc.text(line, x, lineY);
      }
      lineY += block.lineHeight;
    });

    y = lineY + block.afterSpacing;
  });
};

const exportMarkdown = (report: string, templateKey: string) => {
  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${templateKey}-report.md`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function ReportTemplates() {
  const [templateData, setTemplateData] = useState<TemplateMap>(
    defaultTemplates as TemplateMap,
  );
  const keys = Object.keys(templateData);
  const [template, setTemplate] = usePersistentState(
    'reconng-report-template',
    keys[0],
  );
  const [sectionState, setSectionState] = useState<Record<string, boolean>>({});
  const [numberingScheme, setNumberingScheme] =
    useState<FigureNumberingScheme>('arabic');
  const [showDialog, setShowDialog] = useState(false);

  const templateKey = keys.includes(template) ? template : keys[0];
  const selectedTemplate = templateData[templateKey];

  useEffect(() => {
    const { sectionState: defaults, numbering } = templateToState(
      selectedTemplate?.config,
    );
    setSectionState(defaults);
    setNumberingScheme(numbering);
  }, [templateKey, selectedTemplate]);

  const templateConfig = selectedTemplate?.config;

  const renderedTemplate = useMemo(
    () =>
      renderTemplate(
        selectedTemplate?.template || '',
        mockFindings,
        sectionState,
      ),
    [selectedTemplate, sectionState],
  );

  const processed = useMemo(
    () =>
      preprocessMarkdown(
        renderedTemplate,
        templateConfig,
        numberingScheme,
      ),
    [renderedTemplate, templateConfig, numberingScheme],
  );

  const numberingOptions = useMemo(() => {
    const configured = templateConfig?.figureNumbering?.options;
    return configured && configured.length > 0
      ? configured
      : defaultNumberingOptions;
  }, [templateConfig]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as TemplateMap;
        setTemplateData(parsed);
        const first = Object.keys(parsed)[0];
        if (first) setTemplate(first);
      } catch {
        // ignore parse errors
      }
    };
    reader.readAsText(file);
  };

  const shareJson = JSON.stringify(templateData, null, 2);

  const copyShare = () => {
    try {
      navigator.clipboard.writeText(shareJson);
    } catch {
      // ignore clipboard failures
    }
  };

  const handleExportPdf = () => {
    const measurementDoc = new jsPDF({ unit: 'pt', format: 'a4' });
    measurementDoc.setFont('helvetica', 'normal');
    measurementDoc.setFontSize(12);
    const margin = 48;
    const pageWidth = measurementDoc.internal.pageSize.getWidth();
    const pageHeight = measurementDoc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;

    const rawBlocks = parseMarkdownBlocks(processed.markdown, processed.headings);
    const renderBlocks = buildRenderBlocks(measurementDoc, rawBlocks, contentWidth);
    const headingPositions = measureBlocks(renderBlocks, margin, pageHeight);

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    drawBlocks(doc, renderBlocks, margin, pageHeight, headingPositions);
    doc.save(`${templateKey}-report.pdf`);
  };

  const toggleSection = (id: string) => {
    setSectionState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const numberingLabel = numberingLabels[numberingScheme];

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <label htmlFor="template">Template</label>
        <select
          id="template"
          value={templateKey}
          onChange={(e) => setTemplate(e.target.value)}
          className="bg-gray-800 px-2 py-1"
        >
          {Object.entries(templateData).map(([key, t]) => (
            <option key={key} value={key}>
              {t.name}
            </option>
          ))}
        </select>
        <label htmlFor="numbering" className="ml-2">
          Figure numbering
        </label>
        <select
          id="numbering"
          value={numberingScheme}
          onChange={(e) =>
            setNumberingScheme(e.target.value as FigureNumberingScheme)
          }
          className="bg-gray-800 px-2 py-1"
        >
          {numberingOptions.map((option) => (
            <option key={option} value={option}>
              {numberingLabels[option] || option}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => exportMarkdown(processed.markdown, templateKey)}
          className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
        >
          Export Markdown
        </button>
        <button
          type="button"
          onClick={handleExportPdf}
          className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded"
        >
          Export PDF
        </button>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
        >
          Import/Share
        </button>
      </div>
      {templateConfig?.optionalSections?.length ? (
        <div className="flex flex-wrap gap-3 mb-3 text-sm">
          {templateConfig.optionalSections.map((section) => (
            <label key={section.id} className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={sectionState[section.id] !== false}
                onChange={() => toggleSection(section.id)}
              />
              {section.label}
            </label>
          ))}
        </div>
      ) : null}
      <div className="text-xs text-gray-300 mb-2">
        Active figure numbering: {numberingLabel}
      </div>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap text-sm">
        {processed.markdown}
      </pre>
      {showDialog && (
        <dialog open className="p-4 bg-gray-800 text-white rounded max-w-md">
          <p className="mb-2">Import templates (JSON)</p>
          <input type="file" accept="application/json" onChange={handleImport} />
          <p className="mt-4 mb-2">Share templates</p>
          <textarea
            readOnly
            value={shareJson}
            className="w-full h-40 p-1 text-black"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={copyShare}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setShowDialog(false)}
              className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
            >
              Close
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
