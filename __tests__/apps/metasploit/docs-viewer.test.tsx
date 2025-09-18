import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DocsViewer } from '../../../apps/metasploit';

jest.mock('next/router', () => {
  const replace = jest.fn();
  const events = {
    on: jest.fn(),
    off: jest.fn(),
  };
  const routerState = {
    asPath: '/apps/metasploit',
    pathname: '/apps/metasploit',
    replace,
    events,
  };
  return {
    useRouter: () => routerState,
    __mockRouter: routerState,
  };
});

const { __mockRouter } = jest.requireMock('next/router') as {
  __mockRouter: {
    asPath: string;
    pathname: string;
    replace: jest.Mock;
    events: { on: jest.Mock; off: jest.Mock };
  };
};

const htmlFixture = [
  '<h1 id="demo">Demo</h1>',
  '<h2 id="options">Options</h2><p>Details here.</p>',
  '<h2 id="usage">Usage</h2><p>More details.</p>',
].join('');

const headingsFixture = [
  { id: 'options', text: 'Options', depth: 2 },
  { id: 'usage', text: 'Usage', depth: 2 },
];

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const scrollIntoViewMock = jest.fn();

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoViewMock,
  });
});

afterAll(() => {
  if (originalScrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    });
  } else {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: undefined,
    });
  }
});

describe('DocsViewer anchor navigation', () => {
  beforeEach(() => {
    __mockRouter.asPath = '/apps/metasploit';
    __mockRouter.pathname = '/apps/metasploit';
    __mockRouter.replace.mockClear();
    __mockRouter.events.on.mockClear();
    __mockRouter.events.off.mockClear();
    scrollIntoViewMock.mockClear();
  });

  it('scrolls to headings when selecting entries from the table of contents', async () => {
    const markdown = '# Demo\n\n## Options\nDetails here.\n\n## Usage\nMore details.';
    const loader = jest.fn().mockResolvedValue(markdown);
    const markdownRenderer = jest
      .fn()
      .mockImplementation(async () => ({
        html: htmlFixture,
        headings: headingsFixture.map((heading) => ({ ...heading })),
      }));

    render(
      <DocsViewer
        moduleName="auxiliary/admin/example"
        docTitle="Example"
        docLoader={loader}
        markdownRenderer={markdownRenderer}
      />,
    );

    await waitFor(() => expect(markdownRenderer).toHaveBeenCalledWith(markdown));

    const tocButton = await screen.findByRole('button', { name: 'Options' });
    fireEvent.click(tocButton);

    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalled());
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(__mockRouter.replace).toHaveBeenCalledWith(
      '/apps/metasploit#options',
      undefined,
      { shallow: true, scroll: false },
    );

    fireEvent.click(screen.getByRole('button', { name: /Back to top/i }));
    const lastCall = __mockRouter.replace.mock.calls.at(-1);
    expect(lastCall).toEqual([
      '/apps/metasploit',
      undefined,
      { shallow: true, scroll: false },
    ]);
  });

  it('honors hash fragments by jumping to the matching section on load', async () => {
    const markdown = '# Demo\n\n## Options\nDetails here.\n\n## Usage\nMore details.';
    const loader = jest.fn().mockResolvedValue(markdown);
    const markdownRenderer = jest
      .fn()
      .mockImplementation(async () => ({
        html: htmlFixture,
        headings: headingsFixture.map((heading) => ({ ...heading })),
      }));

    __mockRouter.asPath = '/apps/metasploit#usage';

    render(
      <DocsViewer
        moduleName="auxiliary/admin/example"
        docLoader={loader}
        markdownRenderer={markdownRenderer}
      />,
    );

    await waitFor(() => expect(loader).toHaveBeenCalled());
    await waitFor(() => expect(markdownRenderer).toHaveBeenCalledWith(markdown));
    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalled());
    const firstCallArgs = scrollIntoViewMock.mock.calls[0][0];
    expect(firstCallArgs).toMatchObject({ behavior: 'auto', block: 'start' });
  });
});
