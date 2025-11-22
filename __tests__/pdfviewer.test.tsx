import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfViewer from '../components/common/PdfViewer';

jest.mock('pdfjs-dist', () => {
  const getPage = jest.fn(async () => ({
    getViewport: () => ({ width: 100, height: 100, scale: 1 }),
    render: () => ({ promise: Promise.resolve() }),
    getTextContent: async () => ({ items: [{ str: 'hello world' }] }),
  }));
  const getDocument = jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage,
    }),
  }));
  return { getDocument, GlobalWorkerOptions: { workerSrc: '' } };
});

describe('PdfViewer', () => {
  it('renders PDF and searches text', async () => {
    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);
    const canvas = await screen.findByTestId('pdf-canvas');
    expect(canvas).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/search/i), 'hello');
    await user.click(screen.getByText('Search'));
    const results = await screen.findByTestId('search-results');
    expect(within(results).getAllByText(/Page \d/)).toHaveLength(3);
  });

  it('supports keyboard navigation through thumbnails', async () => {
    const user = userEvent.setup();
    render(<PdfViewer url="/sample.pdf" />);
    const options = await screen.findAllByRole('option');
    await user.click(options[0]);
    await user.keyboard('{ArrowDown}');
    const updated = await screen.findAllByRole('option');
    expect(updated[1]).toHaveFocus();
    expect(updated[1]).toHaveAttribute('aria-selected', 'true');
  });
});
