import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfViewer from '../components/common/PdfViewer';

jest.mock('pdfjs-dist', () => {
  const getDocument = jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: jest.fn(async () => ({
        getViewport: () => ({ width: 100, height: 100, scale: 1 }),
        render: () => ({ promise: Promise.resolve() }),
        getTextContent: async () => ({ items: [{ str: 'hello world' }] }),
      })),
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
    expect(await screen.findByText('Page 1')).toBeInTheDocument();
  });
});
