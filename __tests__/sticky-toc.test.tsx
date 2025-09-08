import { render, screen, act } from '@testing-library/react';
import StickyTOC from '../components/docs/StickyTOC';
import { renderMarkdown } from '../lib/markdown';

// Utility to mock IntersectionObserver and expose the callback
class IO {
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

describe('StickyTOC', () => {
  let observer: IO;
  beforeEach(() => {
    // @ts-ignore
    global.IntersectionObserver = jest.fn((cb) => {
      observer = new IO(cb);
      return observer;
    });
  });

  it('highlights active section when intersecting', () => {
    const md = `# Title\n\n## One\n\nText\n\n## Two\n`;
    const { html, headings } = renderMarkdown(md);

    const { container } = render(
      <>
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <StickyTOC headings={headings} />
      </>
    );

    const secondHeading = container.querySelector(`#${headings[2].id}`) as Element;
    act(() => {
      observer.callback([{ target: secondHeading, isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(screen.getByRole('link', { name: 'Two' })).toHaveClass('font-bold');
  });
});
