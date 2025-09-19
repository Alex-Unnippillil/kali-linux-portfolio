export function scanForContrastViolations(options = {}) {
  const { ignoreAttribute } = options;
  const MIN_TEXT_RATIO = 4.5;
  const MIN_UI_RATIO = 3;
  const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

  const parseColor = (value) => {
    if (!value || typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === 'transparent') return { ...TRANSPARENT };

    const hexMatch = normalized.match(/^#([0-9a-f]{3,8})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const expanded = hex.length === 3 || hex.length === 4
        ? hex.split('').map((char) => char + char).join('')
        : hex;
      const hasAlpha = expanded.length === 8;
      const intVal = parseInt(expanded, 16);
      const r = (intVal >> (hasAlpha ? 24 : 16)) & 255;
      const g = (intVal >> (hasAlpha ? 16 : 8)) & 255;
      const b = (intVal >> (hasAlpha ? 8 : 0)) & 255;
      const a = hasAlpha ? (intVal & 255) / 255 : 1;
      return { r, g, b, a };
    }

    const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map((part) => part.trim());
      if (parts.length < 3) return null;
      const [rRaw, gRaw, bRaw, aRaw] = parts;
      const parseChannel = (channel) => {
        if (channel.endsWith('%')) {
          return Math.round((parseFloat(channel) / 100) * 255);
        }
        return Number(channel);
      };
      const r = parseChannel(rRaw);
      const g = parseChannel(gRaw);
      const b = parseChannel(bRaw);
      const a = parts.length === 4 ? Math.min(1, Math.max(0, Number(aRaw))) : 1;
      if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
      return { r, g, b, a };
    }

    // Fallback: try letting the browser parse unknown formats.
    const temp = document.createElement('span');
    temp.style.color = value;
    const container = document.body || document.documentElement;
    container.appendChild(temp);
    const computed = window.getComputedStyle(temp).color;
    temp.remove();
    if (computed === value) return null;
    return parseColor(computed);
  };

  const blendColors = (top, bottom) => {
    const alpha = top.a + bottom.a * (1 - top.a);
    if (alpha <= 0) {
      return { ...TRANSPARENT };
    }
    return {
      r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / alpha,
      g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / alpha,
      b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / alpha,
      a: alpha,
    };
  };

  const srgbToLinear = (value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  const getLuminance = (color) => {
    if (!color) return 0;
    const r = srgbToLinear(color.r);
    const g = srgbToLinear(color.g);
    const b = srgbToLinear(color.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const getContrastRatio = (c1, c2) => {
    if (!c1 || !c2) return 0;
    const l1 = getLuminance(c1);
    const l2 = getLuminance(c2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const getDocumentBackground = () => {
    const docBg = parseColor(window.getComputedStyle(document.documentElement).backgroundColor);
    const bodyBg = parseColor(document.body ? window.getComputedStyle(document.body).backgroundColor : null);
    return docBg || bodyBg || { r: 255, g: 255, b: 255, a: 1 };
  };

  const getEffectiveBackground = (element) => {
    let color = { ...TRANSPARENT };
    let current = element;
    while (current && current !== document.documentElement) {
      const bg = parseColor(window.getComputedStyle(current).backgroundColor);
      if (bg && bg.a > 0) {
        color = blendColors(bg, color);
        if (color.a >= 0.99) {
          break;
        }
      }
      current = current.parentElement;
    }
    if (color.a < 0.99) {
      color = blendColors(getDocumentBackground(), color);
    }
    return color;
  };

  const isHidden = (element, style) => {
    if (!style) return true;
    if (style.display === 'none' || style.visibility === 'hidden') return true;
    if (Number.parseFloat(style.opacity) === 0) return true;
    if (element.getAttribute('aria-hidden') === 'true') return true;
    if (!element.getClientRects || element.getClientRects().length === 0) return true;
    return false;
  };

  const hasDirectText = (element) => {
    return Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0,
    );
  };

  const getElementPath = (element) => {
    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        parts.unshift(selector);
        break;
      }
      if (current.classList.length > 0) {
        const classes = Array.from(current.classList).filter(Boolean).slice(0, 2).join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter(
          (child) => child.tagName === current.tagName,
        );
        if (siblings.length > 1) {
          selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    parts.unshift('html');
    return parts.join(' > ');
  };

  const colorToString = (color) =>
    `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${Number(color.a.toFixed(2))})`;

  const violations = [];
  const root = document.body || document.documentElement;
  if (!root || !root.querySelectorAll) {
    return violations;
  }

  const elements = Array.from(root.querySelectorAll('*'));
  for (const element of elements) {
    if (ignoreAttribute && element.closest?.(`[${ignoreAttribute}]`)) continue;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META'].includes(element.tagName)) continue;

    const style = window.getComputedStyle(element);
    if (isHidden(element, style)) continue;

    const rect = element.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) continue;

    if (hasDirectText(element)) {
      const textColor = parseColor(style.color);
      if (textColor && textColor.a > 0) {
        const backgroundColor = getEffectiveBackground(element);
        const ratio = getContrastRatio(textColor, backgroundColor);
        if (ratio > 0 && ratio + 0.01 < MIN_TEXT_RATIO) {
          violations.push({
            type: 'text',
            ratio,
            path: getElementPath(element),
            foreground: colorToString(textColor),
            background: colorToString(backgroundColor),
            boundingRect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
          });
        }
      }
    }

    const backgroundColor = parseColor(style.backgroundColor);
    if (backgroundColor && backgroundColor.a > 0.05) {
      const parentBackground = element.parentElement
        ? getEffectiveBackground(element.parentElement)
        : getDocumentBackground();
      const ratio = getContrastRatio(backgroundColor, parentBackground);
      if (ratio > 0 && ratio + 0.01 < MIN_UI_RATIO) {
        violations.push({
          type: 'ui',
          ratio,
          path: getElementPath(element),
          foreground: colorToString(backgroundColor),
          background: colorToString(parentBackground),
          boundingRect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    }
  }

  return violations;
}
