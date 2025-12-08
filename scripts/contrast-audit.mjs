/* eslint-env browser */

// Compute relative luminance of an RGB color per WCAG formula
const luminance = ([r, g, b]) => {
  const channel = v => {
    const value = v / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [channel(r), channel(g), channel(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

// Parse an rgb/rgba color string into an array [r,g,b]
const parseColor = color => {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(color);
  return match ? match.slice(1, 4).map(Number) : [0, 0, 0];
};

// Walk up the DOM tree to find the effective background colour
const backgroundFor = element => {
  let el = element;
  while (el && el !== document.documentElement) {
    const { backgroundColor } = getComputedStyle(el);
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
      return parseColor(backgroundColor);
    }
    el = el.parentElement;
  }
  return [255, 255, 255]; // default to white
};

export const logContrastIssues = () => {
  const nodes = Array.from(document.querySelectorAll('*'));
  const failures = [];

  for (const el of nodes) {
    const text = el.textContent?.trim();
    if (!text) continue;

    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) continue;

    const fg = parseColor(style.color);
    const bg = backgroundFor(el);
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    const fontSize = parseFloat(style.fontSize);
    const isBold = parseInt(style.fontWeight, 10) >= 700;
    const isLargeText = fontSize >= 24 || (isBold && fontSize >= 18.66);
    const threshold = isLargeText ? 3 : 4.5;

    if (ratio < threshold) {
      failures.push({
        element: el.tagName.toLowerCase(),
        text: text.slice(0, 60),
        ratio: Number(ratio.toFixed(2)),
        threshold,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      });
    }
  }

  if (failures.length) {
    console.table(failures);
  } else {
    console.log('All elements meet contrast requirements');
  }
};

// Run immediately if executed in a browser context
logContrastIssues();

