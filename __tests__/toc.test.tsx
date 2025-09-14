import React from 'react';
import { render, act } from '@testing-library/react';
import TOC from '../components/TOC';

describe('TOC', () => {
  test('highlights active heading on intersection', () => {
    document.body.innerHTML =
      '<h2 id="sec1">Section 1</h2><h2 id="sec2">Section 2</h2>';

    let callback: IntersectionObserverCallback = () => {};
    (global as any).IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe() {}
      disconnect() {}
    };

    const { getByRole } = render(
      <TOC headings={[{ id: 'sec1', text: 'Section 1' }, { id: 'sec2', text: 'Section 2' }]} />
    );

    act(() => {
      callback(
        [
          {
            target: document.getElementById('sec2') as Element,
            isIntersecting: true,
            intersectionRatio: 1,
            time: 0,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver
      );
    });

    expect(getByRole('link', { name: 'Section 2' }).className).toMatch(/font-bold/);
  });
});

