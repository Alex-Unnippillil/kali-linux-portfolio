import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfViewer from '../components/common/PdfViewer';

type MockPage = ReturnType<typeof createMockPage>;

const mockPages: MockPage[] = [];

const createMockPage = (texts: string[]): MockPage => {
  const items = texts.map((text, index) => ({
    str: text,
    dir: 'ltr',
    transform: [1, 0, 0, 1, 10 * index, 20 + index * 14],
    width: Math.max(20, text.length * 6),
    height: 12,
    fontName: 'Mock',
    hasEOL: false,
  }));
  const viewport = {
    width: 200,
    height: 200,
    scale: 1.5,
    convertToViewportRectangle: (rect: number[]) => rect,
  };
  return {
    getViewport: jest.fn(() => viewport),
    render: jest.fn(() => ({ promise: Promise.resolve() })),
    getTextContent: jest.fn(async () => ({ items })),
  };
};

const getDocument = jest.fn(() => ({
  promise: Promise.resolve({
    numPages: mockPages.length,
    getPage: (pageNumber: number) => Promise.resolve(mockPages[pageNumber - 1]),
  }),
}));

jest.mock('pdfjs-dist', () => ({
  getDocument,
  GlobalWorkerOptions: { workerSrc: '' },
  version: 'test',
}));

describe('PdfViewer', () => {
  beforeEach(() => {
    mockPages.length = 0;
    getDocument.mockClear();
  });

  it('renders PDF, performs search, and highlights matches', async () => {
    mockPages.push(
      createMockPage(['hello world', 'additional text']),
      createMockPage(['other content']),
      createMockPage(['final page']),
    );

    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);

    await screen.findByTestId('pdf-canvas');

    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'hello');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(await screen.findByText('Page 1 — 1 match')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelectorAll('[data-match-index]').length).toBe(1);
    });
  });

  it('supports keyboard navigation through thumbnails', async () => {
    mockPages.push(
      createMockPage(['page one']),
      createMockPage(['page two']),
      createMockPage(['page three']),
    );

    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('handles keyboard shortcuts for search navigation', async () => {
    mockPages.push(
      createMockPage(['alpha beta alpha']),
      createMockPage(['gamma alpha delta']),
      createMockPage(['no matches here']),
    );

    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);

    const input = await screen.findByPlaceholderText(/search/i);
    await user.keyboard('{Control>}f{/Control}');
    expect(input).toHaveFocus();

    await user.type(input, 'alpha');
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Page 1 — 2 matches')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    await user.keyboard('{F3}');
    expect(await screen.findByText('2 / 3')).toBeInTheDocument();

    await user.keyboard('{Shift>}{F3}{/Shift}');
    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
  });

  it('reuses cached text content for repeated searches', async () => {
    const pageOne = createMockPage(['alpha beta']);
    const pageTwo = createMockPage(['beta gamma']);
    mockPages.push(pageOne, pageTwo);

    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);

    const input = await screen.findByPlaceholderText(/search/i);
    await user.type(input, 'alpha');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await screen.findByText('Page 1 — 1 match');

    await user.clear(input);
    await user.type(input, 'beta');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await screen.findByText('Page 1 — 1 match');

    expect(pageOne.getTextContent).toHaveBeenCalledTimes(1);
    expect(pageTwo.getTextContent).toHaveBeenCalledTimes(1);
  });
});
