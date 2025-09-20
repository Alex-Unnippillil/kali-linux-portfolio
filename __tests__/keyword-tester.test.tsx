import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import KeywordTester from '../apps/autopsy/components/KeywordTester';

describe('KeywordTester', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalFileReader = (global as any).FileReader;
  const OriginalBlob = window.Blob;

  beforeEach(() => {
    class FileReaderMock {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsText(file: File | Blob) {
        const read = () => {
          if (typeof (file as any).text === 'function') {
            return (file as any).text();
          }
          if (typeof (file as any).arrayBuffer === 'function') {
            return (file as any)
              .arrayBuffer()
              .then((buffer: ArrayBuffer) => new TextDecoder().decode(buffer));
          }
          return Promise.resolve('');
        };

        read()
          .then((text) => {
            this.onload?.({ target: { result: text } } as ProgressEvent<FileReader>);
          })
          .catch((error) => {
            this.onerror?.({ target: { error } } as ProgressEvent<FileReader>);
          });
      }
    }

    // @ts-ignore
    global.FileReader = FileReaderMock;

    class BlobWithText extends OriginalBlob {
      private __text: string;

      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        this.__text = parts
          .map((part) => (typeof part === 'string' ? part : ''))
          .join('');
      }

      override text(): Promise<string> {
        return Promise.resolve(this.__text);
      }
    }

    Object.defineProperty(window, 'Blob', {
      configurable: true,
      writable: true,
      value: BlobWithText,
    });
    Object.defineProperty(global, 'Blob', {
      configurable: true,
      writable: true,
      value: BlobWithText,
    });

    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn(() => 'blob:mock-url'),
    });

    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });

    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
    if (originalFileReader) {
      // @ts-ignore
      global.FileReader = originalFileReader;
    }
    Object.defineProperty(window, 'Blob', {
      configurable: true,
      writable: true,
      value: OriginalBlob,
    });
    Object.defineProperty(global, 'Blob', {
      configurable: true,
      writable: true,
      value: OriginalBlob,
    });
  });

  const uploadKeywords = (content: string) => {
    const input = screen.getByLabelText(/keyword list/i) as HTMLInputElement;
    const file = new File([content], 'keywords.txt', { type: 'text/plain' });
    if (!(file as any).text) {
      (file as any).text = () => Promise.resolve(content);
    }
    fireEvent.change(input, { target: { files: [file] } });
  };

  const blobToText = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve((event?.target?.result as string) ?? '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

  it('matches keywords in a case-insensitive way and tallies totals', async () => {
    const { container } = render(<KeywordTester />);

    uploadKeywords('ReSuMe');

    await waitFor(() =>
      expect(
        screen.getByText(/Found 2 hits across 1 file/i)
      ).toBeInTheDocument()
    );

    expect(
      screen.getAllByText((content, element) => element?.textContent === 'resume.docx').length
    ).toBeGreaterThan(0);
    expect(container.querySelectorAll('mark').length).toBeGreaterThanOrEqual(2);
  });

  it('exports matched snippets with highlighted context', async () => {
    render(<KeywordTester />);

    uploadKeywords('resume');

    const exportTxtButton = await screen.findByRole('button', {
      name: /export txt/i,
    });

    await waitFor(() => expect(exportTxtButton).not.toBeDisabled());

    fireEvent.click(exportTxtButton);

    const createObjectURLMock = window.URL.createObjectURL as jest.Mock;
    expect(createObjectURLMock).toHaveBeenCalled();

    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    const text = await blobToText(blob);

    expect(text).toContain('Total hits: 2');
    expect(text).toContain('resume.docx');
    expect(text).toContain('**resume**');

    const exportCsvButton = await screen.findByRole('button', {
      name: /export csv/i,
    });

    fireEvent.click(exportCsvButton);

    expect(createObjectURLMock).toHaveBeenCalledTimes(2);
    const csvBlob = createObjectURLMock.mock.calls[1][0] as Blob;
    expect(csvBlob).toBeInstanceOf(Blob);
    expect(csvBlob.size).toBeGreaterThan(0);
    const csv = await blobToText(csvBlob);

    expect(csv).toContain('File,Field,Snippet,Hits');
    expect(csv).toContain('**resume**.docx');
    expect(csv).toContain('**Resume** found on user\'s desktop');
  });
});
