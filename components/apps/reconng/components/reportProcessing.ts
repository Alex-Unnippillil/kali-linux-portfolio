export type FigureNumberingScheme = 'arabic' | 'roman' | 'alphabetic';

export interface Finding {
  title: string;
  description: string;
  severity: string;
}

export interface OptionalSectionConfig {
  id: string;
  label: string;
  defaultIncluded: boolean;
}

export interface TemplateConfig {
  includeTableOfContents?: boolean;
  figureNumbering?: {
    default: FigureNumberingScheme;
    options?: FigureNumberingScheme[];
  };
  optionalSections?: OptionalSectionConfig[];
}

export interface ReportTemplate {
  name: string;
  template: string;
  config?: TemplateConfig;
}

export interface HeadingInfo {
  level: number;
  title: string;
  slug: string;
}

const figurePattern = /!\[Figure(?::\s*([^\]]+))?\]\(([^)]+)\)/g;

const romanNumerals = [
  '',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
];

const toRoman = (value: number) => {
  if (value < romanNumerals.length) {
    return romanNumerals[value];
  }
  const numerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let num = value;
  let result = '';
  numerals.forEach(([n, sym]) => {
    while (num >= n) {
      result += sym;
      num -= n;
    }
  });
  return result;
};

const toAlphabetic = (value: number) => {
  const base = 'A'.charCodeAt(0);
  let num = value;
  let result = '';
  while (num > 0) {
    num -= 1;
    result = String.fromCharCode(base + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
};

export const formatFigureNumber = (
  index: number,
  scheme: FigureNumberingScheme,
): string => {
  switch (scheme) {
    case 'roman':
      return toRoman(index);
    case 'alphabetic':
      return toAlphabetic(index);
    default:
      return String(index);
  }
};

const applyFigureNumbering = (
  markdown: string,
  scheme: FigureNumberingScheme,
) => {
  let counter = 0;
  return markdown.replace(figurePattern, (_, caption, url) => {
    counter += 1;
    const label = formatFigureNumber(counter, scheme);
    const captionText = (caption || '').trim();
    const alt = `Figure ${label}`;
    const descriptive = captionText || `Figure ${label}`;
    const captionLine = `\n_Figure ${label}: ${descriptive}_`;
    return `![${alt}](${url})${captionLine}`;
  });
};

const slugify = (title: string, seen: Map<string, number>) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  const safeBase = base || 'section';
  const count = seen.get(safeBase) || 0;
  seen.set(safeBase, count + 1);
  if (count === 0) {
    return safeBase;
  }
  return `${safeBase}-${count}`;
};

const extractHeadings = (markdown: string): HeadingInfo[] => {
  const headings: HeadingInfo[] = [];
  const seen = new Map<string, number>();
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdown))) {
    const level = match[1].length;
    const title = match[2].trim();
    const slug = slugify(title, seen);
    headings.push({ level, title, slug });
  }
  return headings;
};

const buildTableOfContents = (headings: HeadingInfo[]): string =>
  headings
    .filter((heading) => heading.level > 1 || heading.level === 1)
    .map((heading) => {
      const indent = '  '.repeat(Math.max(0, heading.level - 1));
      return `${indent}- [${heading.title}](#${heading.slug})`;
    })
    .join('\n');

export const renderTemplate = (
  template: string,
  findings: Finding[],
  sections: Record<string, boolean>,
): string => {
  const withSections = template.replace(
    /{{#section\s+([\w-]+)}}([\s\S]*?){{\/section}}/g,
    (match, id: string, content: string) => {
      if (sections[id] === false) {
        return '';
      }
      return content;
    },
  );

  return withSections.replace(
    /{{#findings}}([\s\S]*?){{\/findings}}/g,
    (_, segment: string) =>
      findings
        .map((finding, index) =>
          segment
            .replace(/{{index}}/g, String(index + 1))
            .replace(/{{title}}/g, finding.title)
            .replace(/{{severity}}/g, finding.severity)
            .replace(/{{description}}/g, finding.description),
        )
        .join(''),
  );
};

export interface PreprocessResult {
  markdown: string;
  headings: HeadingInfo[];
  contentHeadings: HeadingInfo[];
}

export const preprocessMarkdown = (
  markdown: string,
  config: TemplateConfig | undefined,
  scheme: FigureNumberingScheme,
): PreprocessResult => {
  const numbered = applyFigureNumbering(markdown, scheme);
  const contentHeadings = extractHeadings(numbered);
  const includeToc = config?.includeTableOfContents !== false;

  let finalMarkdown = numbered;
  if (includeToc && contentHeadings.length > 0) {
    const toc = buildTableOfContents(contentHeadings);
    finalMarkdown = `## Table of Contents\n${toc}\n\n${numbered}`;
  }

  const finalHeadings = extractHeadings(finalMarkdown);
  return {
    markdown: finalMarkdown,
    headings: finalHeadings,
    contentHeadings,
  };
};

export const stripMarkdown = (text: string) =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.+?)\]\([^)]+\)/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
