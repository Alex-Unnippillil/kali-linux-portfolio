import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PdfViewer from '../components/common/PdfViewer';
import type { PDFPageProxy } from 'pdfjs-dist';

const getDocument = jest.fn();
const getPage = jest.fn();

jest.mock('pdfjs-dist', () => ({
  getDocument,
  GlobalWorkerOptions: { workerSrc: '' },
  version: '3.9.179',
}));

type RenderBehavior = () => { promise: Promise<void>; cancel: jest.Mock }; 

interface CreatedPage {
  render: jest.Mock;
  cancelSpy: jest.Mock;
  cleanup: jest.Mock;
}

let renderBehaviorByPage = new Map<number, RenderBehavior>();
let textByPage = new Map<number, string>();
let createdPages = new Map<number, CreatedPage>();
let pdfInstance: { numPages: number; getPage: jest.Mock; destroy: jest.Mock };

const createDefaultBehavior: RenderBehavior = () => ({
  promise: Promise.resolve(),
  cancel: jest.fn(),
});

const createPageMock = (pageNumber: number) => {
  const behaviorFactory = renderBehaviorByPage.get(pageNumber) ?? createDefaultBehavior;
  const { promise, cancel } = behaviorFactory();
  const cancelSpy = cancel ?? jest.fn();
  const cleanup = jest.fn();
  const render = jest.fn(() => ({ promise, cancel: cancelSpy }));
  const page = {
    getViewport: jest.fn(() => ({ width: 600, height: 800 })),
    render,
    getTextContent: jest.fn(async () => ({ items: [{ str: textByPage.get(pageNumber) ?? 'hello world' }] })),
    cleanup,
  } as unknown as PDFPageProxy;
  createdPages.set(pageNumber, { render, cancelSpy, cleanup });
  return page;
};

beforeEach(() => {
  jest.clearAllMocks();
  renderBehaviorByPage = new Map();
  textByPage = new Map();
  createdPages = new Map();
  pdfInstance = {
    numPages: 6,
    getPage,
    destroy: jest.fn(async () => undefined),
  };
  (getDocument as jest.Mock).mockReturnValue({ promise: Promise.resolve(pdfInstance) });
  getPage.mockImplementation((pageNumber: number) => createPageMock(pageNumber));
});

afterEach(() => {
  renderBehaviorByPage.clear();
  textByPage.clear();
  createdPages.clear();
});

describe('PdfViewer virtualization', () => {
  it('loads only visible and adjacent pages initially', async () => {
    render(<PdfViewer url="/sample.pdf" />);

    await screen.findByTestId('page-canvas-1');

    await waitFor(() => expect(getPage).toHaveBeenCalledWith(2));
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(getPage).not.toHaveBeenCalledWith(3);
  });

  it('prefetches upcoming pages when scrolling', async () => {
    render(<PdfViewer url="/sample.pdf" />);

    const container = await screen.findByTestId('pdf-scroll-container');
    Object.defineProperty(container, 'clientHeight', { value: 800, configurable: true });
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
    });

    await screen.findByTestId('page-canvas-1');

    await act(async () => {
      container.scrollTop = 820;
      fireEvent.scroll(container, { target: { scrollTop: 820 } });
    });

    await waitFor(() => expect(getPage).toHaveBeenCalledWith(3));
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(4));
  });

  it('cancels in-flight renders on unmount to release resources', async () => {
    renderBehaviorByPage.set(2, () => {
      const cancel = jest.fn();
      const promise = new Promise<void>(() => {});
      return { promise, cancel };
    });

    const { unmount } = render(<PdfViewer url="/sample.pdf" />);

    await waitFor(() => expect(getPage).toHaveBeenCalledWith(2));
    await waitFor(() => {
      const page = createdPages.get(2);
      expect(page?.render).toHaveBeenCalled();
    });

    const cancelSpy = createdPages.get(2)?.cancelSpy;
    expect(cancelSpy).toBeDefined();

    unmount();

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalled();
      expect(pdfInstance.destroy).toHaveBeenCalled();
    });
  });
});
