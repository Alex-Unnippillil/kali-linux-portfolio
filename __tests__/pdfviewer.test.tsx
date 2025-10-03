import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfViewer from '../components/common/PdfViewer';

const scrollIntoViewMock = jest.fn();

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoViewMock,
  });
});

beforeEach(() => {
  scrollIntoViewMock.mockClear();
});

const textContentByPage = {
  1: {
    items: [
      {
        str: 'hello world',
        transform: [1, 0, 0, 10, 10, 110],
        width: 40,
        height: 10,
      },
      {
        str: 'intro text',
        transform: [1, 0, 0, 10, 10, 90],
        width: 30,
        height: 10,
      },
    ],
  },
  2: {
    items: [
      {
        str: 'HELLO again',
        transform: [1, 0, 0, 10, 10, 110],
        width: 50,
        height: 10,
      },
    ],
  },
  3: {
    items: [
      {
        str: 'closing notes',
        transform: [1, 0, 0, 10, 10, 110],
        width: 60,
        height: 10,
      },
    ],
  },
};

jest.mock('pdfjs-dist', () => {
  const getPage = jest.fn(async (pageNumber: number) => ({
    getViewport: ({ scale }: { scale: number }) => ({
      width: 100 * scale,
      height: 120 * scale,
      scale,
      transform: [scale, 0, 0, -scale, 0, 120 * scale],
    }),
    render: () => ({ promise: Promise.resolve() }),
    getTextContent: async () => textContentByPage[pageNumber] ?? { items: [] },
  }));
  const getDocument = jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage,
    }),
  }));
  return {
    getDocument,
    GlobalWorkerOptions: { workerSrc: '' },
    Util: {
      transform: (_viewport: number[], transform: number[]) => transform,
    },
  };
});

describe('PdfViewer', () => {
  it('renders PDF and shows indexed search results', async () => {
    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);

    await screen.findByTestId('pdf-canvas');

    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'hello');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await screen.findByTestId('search-results');
    expect(screen.getByText('Match 1 of 2')).toBeInTheDocument();

    const items = await screen.findAllByTestId('search-result-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Match 1: Page 1');
    expect(items[1]).toHaveTextContent('Match 2: Page 2');
  });

  it('navigates matches with keyboard shortcuts and buttons', async () => {
    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);

    await screen.findByTestId('pdf-canvas');

    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'hello');
    await user.keyboard('{Enter}');

    await screen.findByText('Match 1 of 2');
    let options = await screen.findAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    await screen.findByText('Match 2 of 2');
    options = await screen.findAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await screen.findByText('Match 1 of 2');
    options = await screen.findAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    const previousButton = screen.getByRole('button', { name: /previous/i });
    await user.click(previousButton);
    await screen.findByText('Match 2 of 2');
  });

  it('supports keyboard navigation through thumbnails', async () => {
    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);

    const options = await screen.findAllByRole('option');
    await user.click(options[0]);
    await user.keyboard('{ArrowRight}');
    const updated = await screen.findAllByRole('option');
    expect(updated[1]).toHaveFocus();
    expect(updated[1]).toHaveAttribute('aria-selected', 'true');
  });
});
