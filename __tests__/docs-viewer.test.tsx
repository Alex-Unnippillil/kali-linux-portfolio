import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DocsViewerProvider, { useDocsViewer } from '../components/apps/docs/DocsViewer';

jest.mock('marked');

describe('DocsViewer', () => {
  const SAMPLE_DOC = `# Terminal Help

Intro text for the Terminal window.

## Getting started
Use the terminal to practice commands in a sandbox.

## Shortcuts
Press Ctrl+C to cancel a running command.
`;

  const scrollIntoView = jest.fn();
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;

  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    scrollIntoView.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const TestHarness: React.FC = () => {
    const { openDoc } = useDocsViewer();
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            openDoc({ appId: 'terminal', docPath: '/docs/apps/terminal.md' })
          }
        >
          Open terminal doc
        </button>
        <button
          type="button"
          onClick={() => openDoc({ appId: 'terminal' })}
        >
          Reopen terminal doc
        </button>
      </div>
    );
  };

  const renderViewer = () =>
    render(
      <DocsViewerProvider>
        <TestHarness />
      </DocsViewerProvider>,
    );

  it('remembers the last document opened per app', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(SAMPLE_DOC),
      } as Response);

    renderViewer();

    fireEvent.click(
      screen.getByRole('button', { name: /^open terminal doc$/i }),
    );
    await screen.findByRole('heading', { name: /terminal help/i });

    fireEvent.click(
      await screen.findByRole('button', { name: /close documentation/i }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: /^reopen terminal doc$/i }),
    );
    await screen.findByRole('heading', { name: /terminal help/i });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/docs/apps/terminal.md');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/docs/apps/terminal.md');

    fetchMock.mockRestore();
  });

  it('returns matches for search queries within the document', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_DOC),
    } as Response);

    renderViewer();

    fireEvent.click(
      screen.getByRole('button', { name: /^open terminal doc$/i }),
    );
    await screen.findByRole('heading', { name: /terminal help/i });

    const searchBox = screen.getByRole('searchbox', {
      name: /search documentation/i,
    });
    fireEvent.change(searchBox, { target: { value: 'terminal' } });

    const resultButton = await screen.findByRole('button', {
      name: /go to terminal help/i,
    });
    fireEvent.click(resultButton);

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());

  });

  it('navigates to headings from the table of contents and updates the hash', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_DOC),
    } as Response);

    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    renderViewer();

    fireEvent.click(
      screen.getByRole('button', { name: /^open terminal doc$/i }),
    );
    await screen.findByRole('heading', { name: /terminal help/i });

    const tocButton = screen.getByRole('button', { name: /^shortcuts$/i });
    fireEvent.click(tocButton);

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(replaceSpy).toHaveBeenCalledWith(
      null,
      '',
      expect.stringContaining('#shortcuts'),
    );

    replaceSpy.mockRestore();
  });
});
