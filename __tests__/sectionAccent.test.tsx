import { render } from '@testing-library/react';
import React from 'react';
import useSectionAccent from '../hooks/useSectionAccent';

describe('useSectionAccent', () => {
  it('updates --accent when section enters view', () => {
    const observers: any[] = [];
    class IntersectionObserverMock {
      callback: any;
      elements: Element[] = [];
      constructor(cb: any) {
        this.callback = cb;
        observers.push(this);
      }
      observe(el: Element) {
        this.elements.push(el);
      }
      unobserve() {}
      disconnect() {}
    }
    // @ts-ignore
    global.IntersectionObserver = IntersectionObserverMock;

    const TestComponent = () => {
      useSectionAccent();
      return (
        <>
          <section data-accent="#111111">One</section>
          <section data-accent="#222222">Two</section>
        </>
      );
    };

    render(<TestComponent />);

    const observer = observers[0];
    // simulate the second section entering the viewport
    observer.callback([
      { target: observer.elements[1], isIntersecting: true },
    ]);

    expect(document.documentElement.style.getPropertyValue('--accent'))
      .toBe('#222222');
  });
});
