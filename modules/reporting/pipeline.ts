import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import type { Content, Element, Root } from 'hast';

export interface ReportFontSet {
  regular: Uint8Array;
  bold: Uint8Array;
  italic?: Uint8Array;
  mono?: Uint8Array;
}

export interface ReportPayload {
  markdown: string;
  template?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface ReportBundle {
  html: string;
  pdf: Uint8Array;
}

interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  mono?: boolean;
}

interface InlineSegment {
  text: string;
  style: InlineStyle;
}

interface Block {
  kind: 'heading' | 'paragraph' | 'list-item' | 'code' | 'separator';
  level?: number;
  segments: InlineSegment[];
  listLabel?: string;
  indent?: number;
  quote?: boolean;
}

interface EmbeddedFonts {
  regular: PDFFont;
  bold: PDFFont;
  italic?: PDFFont;
  mono?: PDFFont;
}

interface LayoutSegment {
  text: string;
  font: PDFFont;
  size: number;
}

interface LayoutLine {
  segments: LayoutSegment[];
  bullet?: string;
  indent: number;
  fontSize: number;
  lineHeight: number;
}

type UnifiedFactory = (...args: unknown[]) => any;
type RemarkPlugin = unknown;

interface MarkdownToolkit {
  unified: UnifiedFactory;
  remarkParse: RemarkPlugin;
  remarkGfm: RemarkPlugin;
  remarkRehype: RemarkPlugin;
  rehypeStringify: RemarkPlugin;
}

let markdownToolkitPromise: Promise<MarkdownToolkit> | null = null;

async function loadMarkdownToolkit(): Promise<MarkdownToolkit> {
  if (!markdownToolkitPromise) {
    markdownToolkitPromise = Promise.all([
      import('unified'),
      import('remark-parse'),
      import('remark-gfm'),
      import('remark-rehype'),
      import('rehype-stringify'),
    ]).then(([unifiedModule, remarkParseModule, remarkGfmModule, remarkRehypeModule, rehypeStringifyModule]) => ({
      unified: unifiedModule.unified,
      remarkParse: remarkParseModule.default as RemarkPlugin,
      remarkGfm: remarkGfmModule.default as RemarkPlugin,
      remarkRehype: remarkRehypeModule.default as RemarkPlugin,
      rehypeStringify: rehypeStringifyModule.default as RemarkPlugin,
    }));
  }
  return markdownToolkitPromise;
}

export const DEFAULT_REPORT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{title}}</title>
    <style>
      @font-face {
        font-family: 'Inter';
        src: url('/fonts/Inter-Regular.ttf') format('truetype');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'Inter';
        src: url('/fonts/Inter-Bold.ttf') format('truetype');
        font-weight: 700;
        font-style: normal;
      }
      @font-face {
        font-family: 'Inter';
        src: url('/fonts/Inter-Italic.ttf') format('truetype');
        font-weight: 400;
        font-style: italic;
      }
      @font-face {
        font-family: 'Fira Code';
        src: url('/fonts/FiraCode-Regular.ttf') format('truetype');
        font-weight: 400;
        font-style: normal;
      }
      body {
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 2.5rem auto;
        max-width: 820px;
        padding: 0 1.5rem 3rem;
        background: #0f172a;
        color: #e2e8f0;
      }
      header {
        margin-bottom: 2.5rem;
      }
      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        color: #f8fafc;
        margin-bottom: 0.75rem;
      }
      p {
        line-height: 1.7;
        margin-bottom: 1.25rem;
      }
      ul,
      ol {
        margin-left: 1.5rem;
        margin-bottom: 1.25rem;
      }
      li {
        margin-bottom: 0.35rem;
      }
      code {
        font-family: 'Fira Code', 'SFMono-Regular', ui-monospace, 'Menlo', monospace;
        background: rgba(15, 23, 42, 0.65);
        padding: 0.15rem 0.35rem;
        border-radius: 0.25rem;
      }
      pre {
        font-family: 'Fira Code', 'SFMono-Regular', ui-monospace, 'Menlo', monospace;
        background: rgba(15, 23, 42, 0.85);
        padding: 1.25rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin-bottom: 1.5rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1.75rem;
      }
      th,
      td {
        border: 1px solid rgba(148, 163, 184, 0.4);
        padding: 0.75rem;
        text-align: left;
      }
      blockquote {
        border-left: 4px solid rgba(99, 102, 241, 0.75);
        padding-left: 1.25rem;
        color: rgba(226, 232, 240, 0.85);
        margin-bottom: 1.25rem;
      }
      .meta {
        font-size: 0.9rem;
        opacity: 0.75;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>{{title}}</h1>
      <p class="meta">Generated: {{date}}</p>
    </header>
    <main>
      {{content}}
    </main>
  </body>
</html>`;

export async function createReportBundle(payload: ReportPayload, fonts: ReportFontSet): Promise<ReportBundle> {
  const markdown = typeof payload.markdown === 'string' ? payload.markdown : '';
  const template = normalizeTemplate(payload.template);
  const metadata = buildMetadata(payload.metadata);
  if (!metadata.title) metadata.title = 'Reconnaissance Report';
  if (!metadata.date) metadata.date = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  const { tree, html } = await renderMarkdown(markdown);
  const filledHtml = applyTemplate(html, template, metadata);
  const pdf = await renderPdf(tree, fonts, metadata);

  return {
    html: filledHtml,
    pdf,
  };
}

function normalizeTemplate(template?: string): string {
  if (typeof template !== 'string' || !template.trim()) {
    return DEFAULT_REPORT_TEMPLATE;
  }
  return template;
}

function buildMetadata(meta?: ReportPayload['metadata']): Record<string, string> {
  const result: Record<string, string> = {};
  if (!meta) return result;
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    result[key] = String(value);
  }
  return result;
}

async function renderMarkdown(markdown: string): Promise<{ tree: Root; html: string }> {
  const toolkit = await loadMarkdownToolkit();
  const processor = toolkit
    .unified()
    .use(toolkit.remarkParse as any)
    .use(toolkit.remarkGfm as any)
    .use(toolkit.remarkRehype as any, { allowDangerousHtml: false });
  const parsed = processor.parse(markdown);
  const tree = (await processor.run(parsed)) as Root;
  const html = String(toolkit.unified().use(toolkit.rehypeStringify as any).stringify(tree));
  return { tree, html };
}

function applyTemplate(html: string, template: string, metadata: Record<string, string>): string {
  const replacements = metadata ?? {};
  const hasContentPlaceholder = /{{\s*content\s*}}/i.test(template);
  const filled = template.replace(/{{\s*([^{}]+)\s*}}/g, (match, key) => {
    const normalized = key.trim();
    if (normalized.toLowerCase() === 'content') {
      return html;
    }
    const direct = replacements[normalized];
    if (direct !== undefined) return direct;
    const lower = replacements[normalized.toLowerCase()];
    return lower ?? '';
  });
  if (!hasContentPlaceholder) {
    return filled + html;
  }
  return filled;
}

async function renderPdf(tree: Root, fonts: ReportFontSet, metadata: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(metadata.title ?? 'Reconnaissance Report');
  doc.setAuthor('Kali Linux Portfolio');
  doc.setCreator('Kali Linux Portfolio');
  doc.setSubject(metadata.subject ?? 'Reconnaissance Report');

  const embedded: EmbeddedFonts = {
    regular: await doc.embedFont(fonts.regular, { subset: true }),
    bold: await doc.embedFont(fonts.bold, { subset: true }),
  };
  if (fonts.italic) {
    embedded.italic = await doc.embedFont(fonts.italic, { subset: true });
  }
  if (fonts.mono) {
    embedded.mono = await doc.embedFont(fonts.mono, { subset: true });
  }

  const blocks = addMetadataBlocks(treeToBlocks(tree), metadata);
  drawBlocks(doc, blocks, embedded);
  const bytes = await doc.save();
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function addMetadataBlocks(blocks: Block[], metadata: Record<string, string>): Block[] {
  const header: Block[] = [];
  if (metadata.title) {
    header.push({
      kind: 'heading',
      level: 1,
      segments: [{ text: metadata.title, style: { bold: true } }],
    });
  }
  if (metadata.subtitle) {
    header.push({
      kind: 'paragraph',
      segments: [{ text: metadata.subtitle, style: { italic: true } }],
    });
  }
  if (metadata.date) {
    header.push({
      kind: 'paragraph',
      segments: [{ text: metadata.date, style: {} }],
    });
  }
  if (metadata.client) {
    header.push({
      kind: 'paragraph',
      segments: [{ text: `Client: ${metadata.client}`, style: {} }],
    });
  }
  if (metadata.author) {
    header.push({
      kind: 'paragraph',
      segments: [{ text: `Author: ${metadata.author}`, style: {} }],
    });
  }

  if (header.length === 0) return blocks;
  return [...header, { kind: 'separator', segments: [] }, ...blocks];
}

function treeToBlocks(tree: Root): Block[] {
  const blocks: Block[] = [];
  for (const node of tree.children) {
    blocks.push(...blocksFromNode(node));
  }
  return blocks;
}

function blocksFromNode(node: Content): Block[] {
  if (node.type === 'text') {
    const value = node.value.trim();
    if (!value) return [];
    return [createParagraph([{ text: value, style: {} }])];
  }
  if (node.type !== 'element') return [];

  const el = node as Element;
  switch (el.tagName) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return [
        {
          kind: 'heading',
          level: parseInt(el.tagName.charAt(1), 10) || 1,
          segments: collectInline(el.children),
        },
      ];
    case 'p':
      return [createParagraph(collectInline(el.children))];
    case 'ul':
      return listBlocks(el, false);
    case 'ol':
      return listBlocks(el, true);
    case 'pre':
      return [createCodeBlock(el)];
    case 'blockquote': {
      const quoted = el.children.flatMap((child) => blocksFromNode(child));
      return quoted.map((block) => ({ ...block, quote: true, indent: Math.max(block.indent ?? 0, 16) }));
    }
    case 'table':
      return [tableToParagraph(el)];
    case 'hr':
      return [{ kind: 'separator', segments: [] }];
    default:
      return el.children.flatMap((child) => blocksFromNode(child));
  }
}

function createParagraph(segments: InlineSegment[]): Block {
  return { kind: 'paragraph', segments: mergeSegments(segments) };
}

function listBlocks(element: Element, ordered: boolean): Block[] {
  const blocks: Block[] = [];
  let index = 0;
  const startValue = parseInt(String(element.properties?.start ?? '1'), 10) || 1;
  for (const child of element.children) {
    if (child.type === 'element' && child.tagName === 'li') {
      const marker = ordered ? `${startValue + index}.` : '•';
      blocks.push({
        kind: 'list-item',
        listLabel: marker,
        indent: 18,
        segments: mergeSegments(collectInline(child.children)),
      });
      index += 1;
    }
  }
  return blocks;
}

function createCodeBlock(element: Element): Block {
  let text = '';
  for (const child of element.children) {
    if (child.type === 'element' && child.tagName === 'code') {
      text += collectCode(child.children);
    } else if (child.type === 'text') {
      text += child.value;
    }
  }
  return {
    kind: 'code',
    segments: [{ text: text.replace(/\s+$/g, ''), style: { mono: true } }],
    indent: 10,
  };
}

function collectCode(children: Content[]): string {
  return children
    .map((child) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'element') return collectCode(child.children);
      return '';
    })
    .join('');
}

function tableToParagraph(element: Element): Block {
  const rows: string[] = [];
  let headers: string[] | null = null;
  for (const section of element.children) {
    if (section.type !== 'element') continue;
    if (section.tagName === 'thead' || section.tagName === 'tbody' || section.tagName === 'tfoot') {
      for (const row of section.children) {
        if (row.type !== 'element' || row.tagName !== 'tr') continue;
        const cells: string[] = [];
        for (const cell of row.children) {
          if (cell.type !== 'element') continue;
          const text = collectInline(cell.children)
            .map((segment) => segment.text)
            .join('');
          cells.push(text.trim());
        }
        if (!cells.length) continue;
        if (section.tagName === 'thead') {
          headers = cells;
        } else {
          rows.push(cells.join(' | '));
        }
      }
    }
  }
  const lines = [headers ? headers.join(' | ') : null, ...rows].filter((line): line is string => Boolean(line));
  return createParagraph([{ text: lines.join('\n'), style: {} }]);
}

function collectInline(children: Content[], parentStyle: InlineStyle = {}): InlineSegment[] {
  const segments: InlineSegment[] = [];
  for (const child of children) {
    if (child.type === 'text') {
      segments.push({ text: child.value, style: { ...parentStyle } });
      continue;
    }
    if (child.type !== 'element') continue;
    const el = child as Element;
    if (el.tagName === 'br') {
      segments.push({ text: '\n', style: { ...parentStyle } });
      continue;
    }
    if (el.tagName === 'img') {
      const alt = typeof el.properties?.alt === 'string' ? el.properties.alt : 'image';
      segments.push({ text: `[${alt}]`, style: { ...parentStyle } });
      continue;
    }
    const nextStyle: InlineStyle = { ...parentStyle };
    if (el.tagName === 'strong' || el.tagName === 'b') nextStyle.bold = true;
    if (el.tagName === 'em' || el.tagName === 'i') nextStyle.italic = true;
    if (el.tagName === 'code' || el.tagName === 'tt' || el.tagName === 'kbd') nextStyle.mono = true;
    segments.push(...collectInline(el.children, nextStyle));
    if (el.tagName === 'a' && typeof el.properties?.href === 'string') {
      segments.push({ text: ` (${el.properties.href})`, style: { ...parentStyle } });
    }
  }
  return mergeSegments(segments);
}

function mergeSegments(segments: InlineSegment[]): InlineSegment[] {
  const merged: InlineSegment[] = [];
  for (const segment of segments) {
    if (!segment.text) continue;
    const last = merged[merged.length - 1];
    if (last && sameStyle(last.style, segment.style)) {
      last.text += segment.text;
    } else {
      merged.push({ text: segment.text, style: { ...segment.style } });
    }
  }
  return merged;
}

function sameStyle(a: InlineStyle, b: InlineStyle): boolean {
  return Boolean(a.bold) === Boolean(b.bold) && Boolean(a.italic) === Boolean(b.italic) && Boolean(a.mono) === Boolean(b.mono);
}

function drawBlocks(doc: PDFDocument, blocks: Block[], fonts: EmbeddedFonts) {
  let page = doc.addPage();
  let { width, height } = page.getSize();
  const margin = 56;
  const maxWidth = width - margin * 2;
  let y = height - margin;

  const ensureSpace = (lineHeight: number) => {
    if (y - lineHeight < margin) {
      page = doc.addPage();
      ({ width, height } = page.getSize());
      y = height - margin;
    }
  };

  for (const block of blocks) {
    if (block.kind === 'separator') {
      ensureSpace(12);
      y -= 8;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        color: rgb(0.45, 0.5, 0.6),
        thickness: 1,
      });
      y -= 18;
      continue;
    }

    const lines = layoutBlock(block, fonts, maxWidth);
    const afterSpacing = getBlockSpacing(block);

    for (const line of lines) {
      ensureSpace(line.lineHeight);
      let cursorX = margin;
      if (line.bullet) {
        const bulletFont = fonts.bold ?? fonts.regular;
        page.drawText(line.bullet, {
          x: cursorX,
          y,
          size: line.fontSize,
          font: bulletFont,
          color: rgb(0, 0, 0),
        });
        cursorX += line.indent;
      } else if (line.indent) {
        cursorX += line.indent;
      }

      for (const segment of line.segments) {
        if (!segment.text.trim()) {
          cursorX += segment.font.widthOfTextAtSize(segment.text, segment.size);
          continue;
        }
        page.drawText(segment.text, {
          x: cursorX,
          y,
          size: segment.size,
          font: segment.font,
          color: rgb(0, 0, 0),
        });
        cursorX += segment.font.widthOfTextAtSize(segment.text, segment.size);
      }
      y -= line.lineHeight;
    }
    y -= afterSpacing;
  }
}

function layoutBlock(block: Block, fonts: EmbeddedFonts, maxWidth: number): LayoutLine[] {
  const fontSize = getFontSize(block);
  const lineHeight = getLineHeight(block, fontSize);
  const bullet = block.kind === 'list-item' ? block.listLabel : undefined;
  const baseIndent = block.kind === 'list-item' ? Math.max(block.indent ?? 0, computeBulletIndent(bullet, fonts, fontSize)) : block.indent ?? 0;
  const effectiveIndent = block.quote ? baseIndent + 12 : baseIndent;
  const availableWidth = Math.max(maxWidth - effectiveIndent, maxWidth * 0.5);
  const tokens = segmentsToTokens(block.segments, fonts, fontSize, block.quote);
  const lines: LayoutLine[] = [];
  let lineSegments: LayoutSegment[] = [];
  let usedCharacters = false;
  let lineWidth = 0;

  const pushLine = (force = false) => {
    const trimmed = trimTrailingSpaces(lineSegments);
    if (!trimmed.length && !force) return;
    lines.push({
      segments: trimmed,
      bullet: lines.length === 0 ? bullet : undefined,
      indent: effectiveIndent,
      fontSize,
      lineHeight,
    });
    lineSegments = [];
    lineWidth = 0;
    usedCharacters = false;
  };

  for (const token of tokens) {
    if (token.kind === 'linebreak') {
      pushLine(true);
      continue;
    }
    if (token.kind === 'whitespace') {
      if (!usedCharacters) continue;
      const width = token.font.widthOfTextAtSize(' ', fontSize);
      lineSegments.push({ text: ' ', font: token.font, size: fontSize });
      lineWidth += width;
      continue;
    }
    if (token.width > availableWidth) {
      // Split overly long tokens to avoid infinite loops
      const chunks = splitToken(token, availableWidth, fontSize);
      for (const chunk of chunks) {
        if (lineWidth + chunk.width > availableWidth && lineSegments.length) {
          pushLine();
        }
        lineSegments.push({ text: chunk.text, font: chunk.font, size: fontSize });
        lineWidth += chunk.width;
        usedCharacters = true;
      }
      continue;
    }
    if (lineWidth + token.width > availableWidth && lineSegments.length) {
      pushLine();
    }
    lineSegments.push({ text: token.text, font: token.font, size: fontSize });
    lineWidth += token.width;
    usedCharacters = true;
  }

  pushLine(tokens.length === 0);
  return lines.length ? lines : [
    {
      segments: [],
      bullet,
      indent: effectiveIndent,
      fontSize,
      lineHeight,
    },
  ];
}

interface Token {
  kind: 'word' | 'whitespace' | 'linebreak';
  text: string;
  font: PDFFont;
  width: number;
}

function segmentsToTokens(segments: InlineSegment[], fonts: EmbeddedFonts, fontSize: number, quote?: boolean): Token[] {
  const tokens: Token[] = [];
  for (const segment of segments) {
    const style = quote ? { ...segment.style, italic: true } : segment.style;
    const font = pickFont(style, fonts);
    const parts = segment.text.split(/\n/);
    parts.forEach((part, index) => {
      const pieces = part.split(/(\s+)/);
      for (const piece of pieces) {
        if (!piece) continue;
        if (/^\s+$/.test(piece)) {
          tokens.push({ kind: 'whitespace', text: ' ', font, width: font.widthOfTextAtSize(' ', fontSize) });
        } else {
          tokens.push({ kind: 'word', text: piece, font, width: font.widthOfTextAtSize(piece, fontSize) });
        }
      }
      if (index < parts.length - 1) {
        tokens.push({ kind: 'linebreak', text: '\n', font, width: 0 });
      }
    });
  }
  return tokens;
}

interface TokenChunk {
  text: string;
  font: PDFFont;
  width: number;
}

function splitToken(token: Token, availableWidth: number, fontSize: number): TokenChunk[] {
  if (token.text.length <= 1) {
    return [
      {
        text: token.text,
        font: token.font,
        width: Math.min(token.width, availableWidth),
      },
    ];
  }
  const chunks: TokenChunk[] = [];
  let current = '';
  let width = 0;
  for (const char of token.text) {
    const charWidth = token.font.widthOfTextAtSize(char, fontSize);
    if (width + charWidth > availableWidth && current) {
      chunks.push({ text: current, font: token.font, width });
      current = char;
      width = charWidth;
    } else {
      current += char;
      width += charWidth;
    }
  }
  if (current) {
    chunks.push({ text: current, font: token.font, width });
  }
  return chunks;
}

function trimTrailingSpaces(segments: LayoutSegment[]): LayoutSegment[] {
  let end = segments.length;
  while (end > 0) {
    const seg = segments[end - 1];
    if (seg.text.trim()) break;
    end -= 1;
  }
  return segments.slice(0, end);
}

function pickFont(style: InlineStyle, fonts: EmbeddedFonts): PDFFont {
  if (style.mono && fonts.mono) return fonts.mono;
  if (style.bold && style.italic && fonts.italic) return fonts.italic;
  if (style.bold) return fonts.bold;
  if (style.italic && fonts.italic) return fonts.italic;
  return fonts.regular;
}

function getFontSize(block: Block): number {
  switch (block.kind) {
    case 'heading':
      switch (block.level) {
        case 1:
          return 22;
        case 2:
          return 18;
        case 3:
          return 16;
        default:
          return 14;
      }
    case 'code':
      return 11.5;
    default:
      return block.quote ? 12.5 : 12.5;
  }
}

function getLineHeight(block: Block, fontSize: number): number {
  if (block.kind === 'code') return fontSize * 1.25;
  if (block.kind === 'heading') return fontSize * 1.2;
  return fontSize * 1.35;
}

function getBlockSpacing(block: Block): number {
  if (block.kind === 'heading') return 14;
  if (block.kind === 'code') return 10;
  if (block.kind === 'list-item') return 6;
  return block.quote ? 10 : 12;
}

function computeBulletIndent(label: string | undefined, fonts: EmbeddedFonts, fontSize: number): number {
  if (!label) return 18;
  const font = fonts.bold ?? fonts.regular;
  return font.widthOfTextAtSize(label, fontSize) + 12;
}
