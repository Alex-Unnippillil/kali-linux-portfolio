import designPortal from '../data/design-portal.json';

export const DEVTOOLS_IGNORE_ATTR = 'data-devtools-ignore';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface TokenLink {
  token: string;
  name: string;
  value: string;
  url: string;
}

export interface ContrastReport {
  selector: string;
  text: string;
  ratio: number;
  threshold: number;
  isLargeText: boolean;
  foreground: string;
  background: string;
  bounding: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  tokenLink?: TokenLink;
  suggestions: TokenLink[];
}

interface DesignPortalEntry {
  token: string;
  value: string;
  name: string;
  url: string;
  category?: string;
}

const isDesignPortalEntry = (value: unknown): value is DesignPortalEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<DesignPortalEntry>;
  return (
    typeof entry.token === 'string' &&
    typeof entry.value === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.url === 'string'
  );
};

const designEntries: DesignPortalEntry[] = Array.isArray(designPortal)
  ? designPortal.filter(isDesignPortalEntry)
  : [];

const DEFAULT_BACKGROUND: RGBA = { r: 255, g: 255, b: 255, a: 1 };

const normalizeHex = (value: string): string => {
  let hex = value.trim();
  if (!hex.startsWith('#')) {
    return hex.toUpperCase();
  }
  hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(ch => ch + ch)
      .join('');
  }
  if (hex.length !== 6) return `#${hex}`.toUpperCase();
  return `#${hex.toUpperCase()}`;
};

export const parseColor = (value: string | null | undefined): RGBA | null => {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'transparent' || trimmed === 'none') {
    return { ...DEFAULT_BACKGROUND, a: 0 };
  }
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(ch => ch + ch)
        .join('');
    }
    if (hex.length === 6) {
      const int = parseInt(hex, 16);
      return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
        a: 1,
      };
    }
    return null;
  }

  const match = trimmed.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;

  const parts = match[1]
    .split(/[\s,\/]+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => (part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part)));

  if (parts.length < 3) return null;

  const [r, g, b, alpha] = parts;
  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b))),
    a: typeof alpha === 'number' && !Number.isNaN(alpha) ? Math.max(0, Math.min(1, alpha)) : 1,
  };
};

export const relativeLuminance = ({ r, g, b }: RGBA): number => {
  const toLinear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

export const contrastRatio = (foreground: RGBA, background: RGBA): number => {
  const lum1 = relativeLuminance(foreground);
  const lum2 = relativeLuminance(background);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

const blend = (foreground: RGBA, background: RGBA): RGBA => {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha <= 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return {
    r: Math.round((foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha),
    g: Math.round((foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha),
    b: Math.round((foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha),
    a: alpha,
  };
};

const rgbaToHex = (color: RGBA): string =>
  `#${[color.r, color.g, color.b]
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();

const tokenByValue: Map<string, TokenLink> = new Map();

designEntries.forEach(entry => {
  const hex = normalizeHex(entry.value);
  if (!tokenByValue.has(hex)) {
    tokenByValue.set(hex, {
      token: entry.token,
      name: entry.name,
      value: hex,
      url: entry.url,
    });
  }
});

const tokenList: TokenLink[] = Array.from(tokenByValue.values());

const getEffectiveBackground = (element: Element | null): RGBA => {
  let current: Element | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    const color = parseColor(style.backgroundColor);
    if (color && color.a > 0) {
      if (color.a < 1) {
        const parentColor = getEffectiveBackground(current.parentElement);
        return blend(color, parentColor);
      }
      return color;
    }
    current = current.parentElement;
  }

  const rootStyle = window.getComputedStyle(document.documentElement);
  const rootColor = parseColor(rootStyle.backgroundColor);
  if (rootColor) {
    if (rootColor.a < 1) return blend(rootColor, DEFAULT_BACKGROUND);
    return rootColor;
  }

  const bodyStyle = window.getComputedStyle(document.body);
  const bodyColor = parseColor(bodyStyle.backgroundColor);
  if (bodyColor) {
    if (bodyColor.a < 1) return blend(bodyColor, DEFAULT_BACKGROUND);
    return bodyColor;
  }

  return DEFAULT_BACKGROUND;
};

const buildSelector = (element: Element): string => {
  if (element.id) {
    return `#${element.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }
  const segments: string[] = [];
  let current: Element | null = element;
  while (current && segments.length < 4) {
    const tag = current.tagName.toLowerCase();
    let segment = tag;
    if (current.classList.length > 0) {
      segment += `.${Array.from(current.classList)
        .map(cls => cls.replace(/[^a-zA-Z0-9_-]/g, ''))
        .filter(Boolean)
        .slice(0, 1)
        .join('.')}`;
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => child.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        segment += `:nth-of-type(${index})`;
      }
    }
    segments.unshift(segment);
    current = current.parentElement;
  }
  return segments.join(' > ');
};

const textSnippet = (element: Element): string => {
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const MAX_LENGTH = 140;
  if (text.length <= MAX_LENGTH) return text;
  return `${text.slice(0, MAX_LENGTH - 1)}…`;
};

const hasVisibleText = (element: Element): boolean => {
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return true;
    }
  }
  return false;
};

const isLargeText = (style: CSSStyleDeclaration): boolean => {
  const fontSize = parseFloat(style.fontSize || '0');
  const weightValue = style.fontWeight || '400';
  const weight = parseInt(weightValue, 10);
  const isBold = Number.isNaN(weight) ? /bold/i.test(weightValue) : weight >= 700;
  return fontSize >= 24 || (fontSize >= 18.66 && isBold);
};

const isElementVisible = (style: CSSStyleDeclaration, rect: DOMRect): boolean => {
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (parseFloat(style.opacity || '1') === 0) return false;
  if (rect.width === 0 || rect.height === 0) return false;
  return true;
};

const suggestTokens = (background: RGBA, minRatio: number, exclude: string[]): TokenLink[] => {
  const suggestions = tokenList
    .map(token => {
      const color = parseColor(token.value);
      if (!color) return null;
      const ratio = contrastRatio(color, background);
      return { token, ratio } as const;
    })
    .filter((entry): entry is { token: TokenLink; ratio: number } =>
      Boolean(entry && entry.ratio >= minRatio && !exclude.includes(entry.token.token)),
    )
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)
    .map(entry => entry.token);

  return suggestions;
};

export const auditDocument = (root: Document | ShadowRoot = document): ContrastReport[] => {
  if (typeof window === 'undefined' || !root) {
    return [];
  }

  const reports: ContrastReport[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let current = walker.nextNode();
  while (current) {
    const element = current as Element;
    current = walker.nextNode();

    if (element.closest(`[${DEVTOOLS_IGNORE_ATTR}]`)) {
      continue;
    }

    if (!hasVisibleText(element)) continue;

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (!isElementVisible(style, rect)) continue;

    const color = parseColor(style.color);
    if (!color) continue;

    const background = getEffectiveBackground(element);
    const effectiveForeground = color.a < 1 ? blend(color, background) : color;

    const ratio = contrastRatio(effectiveForeground, background);
    const threshold = isLargeText(style) ? 3 : 4.5;

    if (ratio >= threshold) continue;

    const selector = buildSelector(element);
    const text = textSnippet(element);
    if (!text) continue;

    const bounding = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };

    const foregroundHex = rgbaToHex(effectiveForeground);
    const backgroundHex = rgbaToHex(background);
    const tokenLink = tokenByValue.get(foregroundHex);
    const suggestions = suggestTokens(background, threshold, tokenLink ? [tokenLink.token] : []);

    reports.push({
      selector,
      text,
      ratio,
      threshold,
      isLargeText: threshold === 3,
      foreground: foregroundHex,
      background: backgroundHex,
      bounding,
      tokenLink,
      suggestions,
    });
  }

  return reports.sort((a, b) => a.ratio - b.ratio);
};
