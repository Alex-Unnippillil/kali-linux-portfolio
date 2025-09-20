import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KeywordTester from '../../../apps/autopsy/components/KeywordTester';

let mockFileText = '';

const readBlobText = async (blob: Blob): Promise<string> => {
  const anyBlob = blob as any;
  if (typeof anyBlob.text === 'function') {
    return anyBlob.text();
  }
  if (typeof anyBlob.arrayBuffer === 'function') {
    const buffer = await anyBlob.arrayBuffer();
    return Buffer.from(buffer).toString('utf8');
  }
  return String(anyBlob);
};

class FileReaderMock {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

  readAsText() {
    if (this.onload) {
      this.onload({ target: { result: mockFileText } } as ProgressEvent<FileReader>);
    }
  }
}

describe('KeywordTester keyword hit pipeline', () => {
  beforeEach(() => {
    mockFileText = '';
    // @ts-ignore - override FileReader for the test environment
    global.FileReader = FileReaderMock;
  });

  const renderWithKeywords = async (text: string) => {
    mockFileText = text;
    render(<KeywordTester />);
    const input = screen.getByLabelText(/keyword list file/i) as HTMLInputElement;
    const file = new File(['dummy'], 'keywords.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByTestId('keyword-summary');
  };

  it('parses multi-term keyword lists, counts hits, and highlights snippets', async () => {
    await renderWithKeywords('RESUME, suspicious\nTemp');

    const summary = screen.getByTestId('keyword-summary');
    expect(summary).toHaveTextContent('Loaded 2 lists covering 3 terms');
    expect(summary).toHaveTextContent('3 matched artifacts');
    expect(summary).toHaveTextContent('4 total hits');

    const resumeResult = screen.getByTestId('artifact-result-resume-docx');
    expect(resumeResult).toHaveTextContent('resume.docx');
    expect(resumeResult).toHaveTextContent('2 hits');

    expect(screen.getByTestId('artifact-result-run-exe')).toHaveTextContent('1 hit');
    expect(
      screen.getByTestId('artifact-result-hkcu-software-example')
    ).toHaveTextContent('1 hit');

    const preview = screen.getByTestId('preview-content');
    expect(preview.querySelectorAll('mark').length).toBeGreaterThanOrEqual(2);
    expect(preview.innerHTML.toLowerCase()).toContain('<mark>resume</mark>');
  });

  it('exports matched lines as a text file', async () => {
    await renderWithKeywords('resume');

    const originalCreate = (URL as any).createObjectURL;
    const originalRevoke = (URL as any).revokeObjectURL;
    const originalBlob = (global as any).Blob;
    class BlobMock {
      parts: any[];
      type?: string;

      constructor(parts: any[], options?: BlobPropertyBag) {
        this.parts = parts;
        this.type = options?.type;
      }

      text() {
        return Promise.resolve(this.parts.join(''));
      }
    }
    (global as any).Blob = BlobMock as unknown as typeof Blob;
    const createObjectURL = jest.fn(() => 'blob:mock');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
    const anchor = document.createElement('a');
    const clickSpy = jest.spyOn(anchor, 'click').mockImplementation(() => {});
    const createElementSpy = jest
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor);

    try {
      fireEvent.click(screen.getByTestId('export-button'));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      const text = await readBlobText(blob);
      expect(text).toContain('resume.docx: Name: resume.docx');
      expect(text).toContain(
        "resume.docx: Description: Resume found on user's desktop"
      );
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(anchor.download).toBe('keyword-hits.txt');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    } finally {
      if (originalBlob) {
        (global as any).Blob = originalBlob;
      } else {
        delete (global as any).Blob;
      }

      if (originalCreate) {
        Object.defineProperty(URL, 'createObjectURL', {
          configurable: true,
          writable: true,
          value: originalCreate,
        });
      } else {
        delete (URL as any).createObjectURL;
      }

      if (originalRevoke) {
        Object.defineProperty(URL, 'revokeObjectURL', {
          configurable: true,
          writable: true,
          value: originalRevoke,
        });
      } else {
        delete (URL as any).revokeObjectURL;
      }

      createElementSpy.mockRestore();
      clickSpy.mockRestore();
    }
  });

  it('shows empty state messaging when no artifacts match', async () => {
    await renderWithKeywords('nonexistent');

    const summary = screen.getByTestId('keyword-summary');
    expect(summary).toHaveTextContent('Loaded 1 list covering 1 term');
    expect(summary).toHaveTextContent('0 matched artifacts');

    expect(screen.getByTestId('results-empty')).toHaveTextContent(
      'No hits found in the mock case artifacts.'
    );
    expect(screen.getByTestId('preview-empty')).toHaveTextContent(
      'No artifacts matched your keyword lists. Try adjusting the terms.'
    );
    expect(screen.queryByTestId('export-button')).not.toBeInTheDocument();
  });
});
