const fs = require('fs');
const path = require('path');

const { typographyScale, lineHeights, typeSpacing } = require('../lib/typography-scale');
const tailwindConfig = require('../tailwind.config.js');

const tokensPath = path.join(__dirname, '..', 'styles', 'tokens.css');
const tokensCss = fs.readFileSync(tokensPath, 'utf8');

describe('typography scale tokens', () => {
  it('exposes clamp-based values for every scale level', () => {
    Object.values(typographyScale).forEach((group) => {
      Object.values(group).forEach((value) => {
        expect(value.startsWith('clamp(')).toBe(true);
        expect(value.endsWith(')')).toBe(true);
      });
    });
  });

  it('synchronises CSS variables with the JavaScript source of truth', () => {
    Object.entries(typographyScale).forEach(([groupName, group]) => {
      Object.entries(group).forEach(([level, value]) => {
        const varName = `--font-size-${groupName}-${level}`;
        expect(tokensCss).toContain(`${varName}: ${value};`);
      });
    });

    Object.entries(lineHeights).forEach(([name, value]) => {
      const varName = `--line-height-${name}`;
      expect(tokensCss).toContain(`${varName}: ${value};`);
    });

    Object.entries(typeSpacing).forEach(([name, value]) => {
      const kebabName = name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
      const varName = `--type-${kebabName}`;
      expect(tokensCss).toContain(`${varName}: ${value};`);
    });
  });
});

describe('tailwind typography mapping', () => {
  const fontSizeConfig = tailwindConfig?.theme?.extend?.fontSize ?? {};
  const lineHeightConfig = tailwindConfig?.theme?.extend?.lineHeight ?? {};
  const fontFamilyConfig = tailwindConfig?.theme?.extend?.fontFamily ?? {};

  it('maps text utilities to the responsive clamp values', () => {
    expect(fontSizeConfig.xs[0]).toBe(typographyScale.body.xs);
    expect(fontSizeConfig.sm[0]).toBe(typographyScale.body.sm);
    expect(fontSizeConfig.base[0]).toBe(typographyScale.body.md);
    expect(fontSizeConfig.lg[0]).toBe(typographyScale.body.lg);
    expect(fontSizeConfig.xl[0]).toBe(typographyScale.heading.xs);
    expect(fontSizeConfig['2xl'][0]).toBe(typographyScale.heading.sm);
    expect(fontSizeConfig['3xl'][0]).toBe(typographyScale.heading.md);
    expect(fontSizeConfig['4xl'][0]).toBe(typographyScale.heading.lg);
    expect(fontSizeConfig['5xl'][0]).toBe(typographyScale.display.sm);
    expect(fontSizeConfig['6xl'][0]).toBe(typographyScale.display.md);
    expect(fontSizeConfig['7xl'][0]).toBe(typographyScale.display.lg);
  });

  it('exposes line-height helpers bound to design tokens', () => {
    expect(lineHeightConfig.tight).toBe(String(lineHeights.tight));
    expect(lineHeightConfig.snug).toBe(String(lineHeights.snug));
    expect(lineHeightConfig.normal).toBe(String(lineHeights.standard));
    expect(lineHeightConfig.relaxed).toBe(String(lineHeights.relaxed));
    expect(lineHeightConfig.mono).toBe(String(lineHeights.mono));
  });

  it('uses CSS variable driven font stacks', () => {
    expect(fontFamilyConfig.sans[0]).toBe('var(--font-family-base)');
    expect(fontFamilyConfig.mono[0]).toBe('var(--font-family-mono)');
  });
});
