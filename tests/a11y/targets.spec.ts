import { expect, test } from '@playwright/test';
import path from 'path';
import { readFile } from 'fs/promises';

const MIN_TOUCH_TARGET = 44;
const SIZE_TOLERANCE = 0.5;

const SAMPLE_TARGETS = [
  { label: 'button', tag: 'button', text: 'Button' },
  {
    label: '[role="button"]',
    tag: 'div',
    text: 'Role button',
    attributes: { role: 'button' },
    tabIndex: 0,
    style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  },
  { label: 'input[type="button"]', tag: 'input', text: 'Input button', attributes: { type: 'button' } },
  { label: 'input[type="submit"]', tag: 'input', text: 'Submit', attributes: { type: 'submit' } },
  { label: 'input[type="reset"]', tag: 'input', text: 'Reset', attributes: { type: 'reset' } },
  {
    label: '.hit-area',
    tag: 'div',
    text: 'Hit area',
    className: 'hit-area',
    style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  },
] as const;

test.describe('Touch target sizing', () => {
  test('interactive controls are at least 44x44px', async ({ page }) => {
    test.setTimeout(120_000);

    const rootDir = path.resolve(__dirname, '../../');
    const [tokensCss, componentsCss] = await Promise.all([
      readFile(path.join(rootDir, 'styles/tokens.css'), 'utf8'),
      readFile(path.join(rootDir, 'styles/components.css'), 'utf8'),
    ]);

    await page.setContent('<!DOCTYPE html><html><head></head><body></body></html>');
    await page.addStyleTag({ content: `${tokensCss}\n${componentsCss}` });

    const samples = await page.evaluate((targets) => {
      const container = document.createElement('div');
      container.id = 'touch-target-test-container';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.display = 'flex';
      container.style.flexWrap = 'wrap';
      container.style.gap = '8px';
      container.style.padding = '4px';
      container.style.background = 'transparent';
      container.style.zIndex = '2147483647';

      document.body.appendChild(container);

      const created = targets.map((target) => {
        const element = document.createElement(target.tag);

        if (target.className) element.className = target.className;
        if (typeof target.tabIndex === 'number') element.tabIndex = target.tabIndex;
        if (target.attributes) {
          Object.entries(target.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
          });
        }

        if (target.text) {
          if (target.tag === 'input') {
            element.setAttribute('value', target.text);
          } else {
            element.textContent = target.text;
          }
        }

        if (target.style) {
          Object.entries(target.style).forEach(([key, value]) => {
            element.style.setProperty(key, value);
          });
        }

        container.appendChild(element);
        const rect = element.getBoundingClientRect();

        const styles = window.getComputedStyle(element);

        return {
          label: target.label,
          width: rect.width,
          height: rect.height,
          minWidth: styles.minWidth,
          minHeight: styles.minHeight,
        };
      });

      const containerRect = container.getBoundingClientRect();
      const snapshot = { containerWidth: containerRect.width, containerHeight: containerRect.height };
      container.remove();
      return { created, snapshot };
    }, SAMPLE_TARGETS);

    for (const sample of samples.created) {
      expect
        .soft(sample.width, `${sample.label} width`)
        .toBeGreaterThanOrEqual(MIN_TOUCH_TARGET - SIZE_TOLERANCE);
      expect
        .soft(sample.height, `${sample.label} height`)
        .toBeGreaterThanOrEqual(MIN_TOUCH_TARGET - SIZE_TOLERANCE);
    }
  });
});
