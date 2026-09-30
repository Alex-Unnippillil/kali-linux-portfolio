import { scanInteractiveElements } from '../utils/dom/interactiveScanner';

describe('scanInteractiveElements', () => {
  const assignRect = (
    element: HTMLElement,
    rect: { left: number; top: number; width: number; height: number }
  ) => {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          x: rect.left,
          y: rect.top,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          right: rect.left + rect.width,
          bottom: rect.top + rect.height,
          toJSON: () => ({}),
        } as DOMRect),
    });
  };

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('collects visible, actionable interactive elements with labels', () => {
    document.body.innerHTML = `
      <main>
        <button id="primary">Launch scan</button>
        <a id="docs" href="/docs">Documentation</a>
        <input id="name" placeholder="Your name" />
        <div id="hidden" style="display:none">
          <button id="hidden-btn">Hidden</button>
        </div>
        <div id="aria-hidden" aria-hidden="true">
          <button id="decorative">Ignore me</button>
        </div>
        <button id="disabled" disabled>Disabled</button>
        <div id="custom" role="button" aria-label="Custom toggle"></div>
      </main>
    `;

    const primary = document.getElementById('primary') as HTMLElement;
    const docs = document.getElementById('docs') as HTMLElement;
    const name = document.getElementById('name') as HTMLElement;
    const custom = document.getElementById('custom') as HTMLElement;
    const hiddenButton = document.getElementById('hidden-btn') as HTMLElement;
    const disabled = document.getElementById('disabled') as HTMLElement;

    assignRect(primary, { left: 10, top: 10, width: 120, height: 40 });
    assignRect(docs, { left: 10, top: 80, width: 140, height: 24 });
    assignRect(name, { left: 10, top: 120, width: 200, height: 36 });
    assignRect(custom, { left: 10, top: 170, width: 160, height: 32 });
    assignRect(hiddenButton, { left: 10, top: 220, width: 120, height: 40 });
    assignRect(disabled, { left: 10, top: 270, width: 120, height: 40 });

    const results = scanInteractiveElements();
    const ids = results.map((result) => result.element.id);

    expect(ids).toEqual(expect.arrayContaining(['primary', 'docs', 'name', 'custom']));
    expect(ids).not.toEqual(expect.arrayContaining(['hidden-btn', 'disabled']));

    const nameResult = results.find((result) => result.element.id === 'name');
    expect(nameResult?.label).toBe('Your name');

    const customResult = results.find((result) => result.element.id === 'custom');
    expect(customResult?.label).toBe('Custom toggle');
    expect(customResult?.role).toBe('button');

    const primaryRect = results.find((result) => result.element.id === 'primary')?.rect;
    expect(primaryRect).toMatchObject({ width: 120, height: 40 });
  });

  it('uses aria-labelledby text when provided', () => {
    document.body.innerHTML = `
      <div>
        <span id="label">Submit form</span>
        <button id="submit" aria-labelledby="label"></button>
      </div>
    `;

    const submit = document.getElementById('submit') as HTMLElement;
    assignRect(submit, { left: 0, top: 0, width: 100, height: 40 });

    const [result] = scanInteractiveElements();
    expect(result.element.id).toBe('submit');
    expect(result.label).toBe('Submit form');
  });
});
