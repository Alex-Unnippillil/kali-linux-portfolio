/** @jest-environment jsdom */

describe('Calculator app', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <div id="display" class="display"></div>
      <button id="toggle-scientific"></button>
      <button id="toggle-precise"></button>
      <div id="scientific" class="hidden"></div>
      <div class="buttons">
        <button class="btn" data-action="equals">=</button>
        <button class="btn" data-action="clear">C</button>
      </div>
      <details id="history-container"><summary>History</summary>
        <div id="history" class="history"></div>
      </details>
    `;
    const { create, all } = require('mathjs');
    // @ts-ignore
    global.math = create(all);
    localStorage.clear();
    require('../apps/calculator/main.js');
  });

  test('evaluates decimals precisely', () => {
    const display = document.getElementById('display')!;
    display.textContent = '1.1+2.2';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(display.textContent).toBe('3.3');
  });

  test('keeps at most 10 history entries', () => {
    const display = document.getElementById('display')!;
    for (let i = 0; i < 11; i++) {
      display.textContent = `${i}+1`;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    }
    const stored = JSON.parse(localStorage.getItem('calc-history') || '[]');
    expect(stored.length).toBeLessThanOrEqual(10);
    const entries = document.querySelectorAll('#history .history-entry');
    expect(entries.length).toBeLessThanOrEqual(10);
  });

  test('Enter key triggers evaluation', () => {
    const display = document.getElementById('display')!;
    display.textContent = '1+1';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(display.textContent).toBe('2');
  });
});

