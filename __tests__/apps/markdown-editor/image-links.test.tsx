import React from 'react';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MarkdownEditor from '../../../components/apps/markdown-editor';

const getDirMock = jest.fn();
const writeFileMock = jest.fn();

jest.mock('../../../hooks/useOPFS', () => ({
  __esModule: true,
  default: () => ({
    supported: true,
    root: {},
    getDir: getDirMock,
    readFile: jest.fn(),
    writeFile: writeFileMock,
    deleteFile: jest.fn(),
    listFiles: jest.fn(),
  }),
}));

jest.mock('marked', () => {
  const parse = (input: string) => input;
  const lexer = (input: string) => {
    const tokens: Array<{ type: string; href: string }> = [];
    const regex = /!?(\[[^\]]*\])\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      tokens.push({ type: 'link', href: match[2] });
    }
    return tokens;
  };
  return {
    marked: {
      parse,
      lexer,
    },
  };
});

describe('MarkdownEditor image handling', () => {
  const originalCreate = (global.URL as any).createObjectURL;
  const originalRevoke = (global.URL as any).revokeObjectURL;

  beforeAll(() => {
    (global.URL as any).createObjectURL = jest.fn(() => 'blob:mock-url');
    (global.URL as any).revokeObjectURL = jest.fn();
  });

  afterAll(() => {
    if (originalCreate) {
      (global.URL as any).createObjectURL = originalCreate;
    } else {
      delete (global.URL as any).createObjectURL;
    }
    if (originalRevoke) {
      (global.URL as any).revokeObjectURL = originalRevoke;
    } else {
      delete (global.URL as any).revokeObjectURL;
    }
  });

  beforeEach(() => {
    getDirMock.mockReset();
    writeFileMock.mockReset();
    getDirMock.mockResolvedValue({ name: 'files-dir' });
    writeFileMock.mockResolvedValue(true);
  });

  it('saves pasted images to Files and inserts a relative link', async () => {
    const saved: Array<{ name: string; data: File; dir: unknown }> = [];
    const dirHandle = { name: 'files-dir' };
    getDirMock.mockResolvedValue(dirHandle);
    writeFileMock.mockImplementation(async (name: string, data: File, dir: unknown) => {
      saved.push({ name, data, dir });
      return true;
    });

    render(<MarkdownEditor />);

    const textarea = screen.getByLabelText(/Markdown input/i) as HTMLTextAreaElement;
    textarea.focus();

    const file = new File(['binary'], 'clipboard.png', { type: 'image/png' });
    const preventDefault = jest.fn();
    const clipboardData = {
      items: [
        {
          kind: 'file',
          type: 'image/png',
          getAsFile: () => file,
        },
      ],
      types: ['Files'],
    } as unknown as DataTransfer;

    const pasteEvent = createEvent.paste(textarea, {
      clipboardData,
    });

    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: clipboardData,
    });
    pasteEvent.preventDefault = preventDefault;

    fireEvent(textarea, pasteEvent);

    await waitFor(() => expect(writeFileMock).toHaveBeenCalled());

    expect(preventDefault).toHaveBeenCalled();
    expect(getDirMock).toHaveBeenCalledWith('files/markdown-editor');
    expect(saved).toHaveLength(1);
    expect(saved[0].dir).toBe(dirHandle);
    expect(saved[0].data).toBe(file);
    expect(saved[0].name).toMatch(/^pasted-/);

    await waitFor(() =>
      expect(textarea.value).toMatch(
        /!\[Pasted image]\(files\/markdown-editor\/pasted-[a-z0-9-]+\.png\)/i,
      ),
    );

    expect(screen.getByText(/Saved pasted image/i)).toBeInTheDocument();
  });
});

describe('MarkdownEditor link validation', () => {
  beforeEach(() => {
    getDirMock.mockReset();
    writeFileMock.mockReset();
    getDirMock.mockResolvedValue({ name: 'files-dir' });
    writeFileMock.mockResolvedValue(true);
  });

  it('validates external links with HEAD requests and shows warnings', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://ok.test') {
        return { ok: true, status: 200 } as Response;
      }
      if (url === 'https://fail.test') {
        return { ok: false, status: 404 } as Response;
      }
      return { ok: false, status: 500 } as Response;
    });

    render(<MarkdownEditor fetchImpl={fetchMock} />);

    const textarea = screen.getByLabelText(/Markdown input/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value:
          'Working [good](https://ok.test)\nBroken [bad](https://fail.test)',
      },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'https://ok.test',
        expect.objectContaining({ method: 'HEAD' }),
      ),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'https://fail.test',
        expect.objectContaining({ method: 'HEAD' }),
      ),
    );

    await waitFor(() =>
      expect(
        screen.getByText('Link unreachable: https://fail.test'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText('Link unreachable: https://ok.test'),
    ).not.toBeInTheDocument();

    fireEvent.change(textarea, {
      target: {
        value: 'Updated [good](https://ok.test)',
      },
    });

    await waitFor(() =>
      expect(
        screen.queryByText('Link unreachable: https://fail.test'),
      ).not.toBeInTheDocument(),
    );
  });
});
