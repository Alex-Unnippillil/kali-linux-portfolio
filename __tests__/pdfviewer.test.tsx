import React from 'react';
import { render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: /fit to width/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.type(screen.getByPlaceholderText(/search/i), 'hello');
    await user.click(screen.getByText('Search'));
    expect(await screen.findByText('Page 1')).toBeInTheDocument();
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

  it('restores saved zoom preference for the same document', async () => {
    window.localStorage.setItem('pdfViewerZoom:/sample.pdf', 'actual-size');
    render(<PdfViewer url="/sample.pdf" />);
    const actualSizeButton = await screen.findByRole('button', {
      name: /actual size/i,
    });
    expect(actualSizeButton).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('pdfViewerZoom:/sample.pdf')).toBe(
      'actual-size',
    );
  });
});
