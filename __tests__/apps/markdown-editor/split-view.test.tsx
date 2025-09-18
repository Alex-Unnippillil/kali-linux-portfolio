import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MarkdownEditor from '../../../apps/markdown-editor';

jest.mock('marked', () => {
  const parse = (value: string) => {
    return value
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => {
        if (line.startsWith('## ')) {
          return `<h2>${line.slice(3)}</h2>`;
        }
        if (line.startsWith('# ')) {
          return `<h1>${line.slice(2)}</h1>`;
        }
        const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        return `<p>${formatted}</p>`;
      })
      .join('\n');
  };

  return {
    marked: {
      parse,
      setOptions: () => undefined,
    },
  };
});

let editorOnScroll: ((event: { scrollTop: number; scrollHeight: number }) => void) | null = null;
let editorScrollTop = 0;
let editorScrollHeight = 1200;
let editorViewportHeight = 600;

const readBlob = async (blob: Blob) => {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
};

const triggerEditorScroll = (scrollTop: number) => {
  if (!editorOnScroll) {
    throw new Error('editorOnScroll not registered');
  }
  editorScrollTop = scrollTop;
  editorOnScroll?.({ scrollTop, scrollHeight: editorScrollHeight });
};

jest.mock('@monaco-editor/react', () => {
  const React = require('react');
  return function MonacoEditorMock(props: any) {
    React.useLayoutEffect(() => {
      const editor = {
        getScrollHeight: () => editorScrollHeight,
        getLayoutInfo: () => ({ height: editorViewportHeight }),
        getDomNode: () => ({ clientHeight: editorViewportHeight }),
        getScrollTop: () => editorScrollTop,
        setScrollTop: (value: number) => {
          editorScrollTop = value;
        },
        onDidScrollChange: (handler: typeof editorOnScroll) => {
          editorOnScroll = handler;
          return {
            dispose: () => {
              if (editorOnScroll === handler) {
                editorOnScroll = null;
              }
            },
          };
        },
        updateOptions: () => undefined,
        focus: () => undefined,
        layout: () => undefined,
      };
      props.onMount?.(editor, {} as any);
    }, [props.onMount]);

    return (
      <textarea
        data-testid="markdown-input"
        value={props.value}
        onChange={(event) => props.onChange?.(event.target.value, event)}
      />
    );
  };
});

describe('Markdown editor split view', () => {
  beforeEach(() => {
    editorOnScroll = null;
    editorScrollTop = 0;
    editorScrollHeight = 1200;
    editorViewportHeight = 600;
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps preview scroll drift under 20px when syncing from editor', async () => {
    render(<MarkdownEditor />);

    await waitFor(() => {
      expect(editorOnScroll).not.toBeNull();
    });
    const preview = screen.getByTestId('markdown-preview');

    let previewScrollTop = 0;
    Object.defineProperty(preview, 'scrollTop', {
      configurable: true,
      get: () => previewScrollTop,
      set: (value: number) => {
        previewScrollTop = value;
      },
    });
    Object.defineProperty(preview, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(preview, 'clientHeight', {
      configurable: true,
      value: 800,
    });

    editorScrollHeight = 1600;
    editorViewportHeight = 600;

    act(() => {
      triggerEditorScroll(400);
    });

    const maxEditor = editorScrollHeight - editorViewportHeight;
    const maxPreview = (preview as any).scrollHeight - (preview as any).clientHeight;
    const expected = (400 / maxEditor) * maxPreview;
    const drift = Math.abs(previewScrollTop - expected);
    expect(drift).toBeLessThan(20);
  });

  it('syncs editor scroll position when preview scrolls', () => {
    render(<MarkdownEditor />);
    const preview = screen.getByTestId('markdown-preview');

    let previewScrollTop = 0;
    Object.defineProperty(preview, 'scrollTop', {
      configurable: true,
      get: () => previewScrollTop,
      set: (value: number) => {
        previewScrollTop = value;
      },
    });
    Object.defineProperty(preview, 'scrollHeight', {
      configurable: true,
      value: 1500,
    });
    Object.defineProperty(preview, 'clientHeight', {
      configurable: true,
      value: 600,
    });

    editorScrollHeight = 1800;
    editorViewportHeight = 700;

    act(() => {
      preview.scrollTop = 500;
      fireEvent.scroll(preview);
    });

    const maxEditor = editorScrollHeight - editorViewportHeight;
    const maxPreview = (preview as any).scrollHeight - (preview as any).clientHeight;
    const expected = (500 / maxPreview) * maxEditor;
    const drift = Math.abs(editorScrollTop - expected);
    expect(drift).toBeLessThan(20);
  });

  it('exports sanitized HTML with inline styles and metadata', async () => {
    render(<MarkdownEditor />);

    const input = screen.getByTestId('markdown-input');
    fireEvent.change(input, {
      target: {
        value: '# Title\n\n<script>alert(1)</script>\n\nParagraph with **bold** text.',
      },
    });

    const realCreateElement = document.createElement.bind(document);
    const anchor = realCreateElement('a');
    const clickMock = jest.fn();
    anchor.click = clickMock;

    const createElementSpy = jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'a') {
          return anchor;
        }
        return realCreateElement(tagName);
      });

    let exportedBlob: Blob | null = null;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURLMock = jest.fn((blob: Blob) => {
      exportedBlob = blob;
      return 'blob:export';
    });
    const revokeObjectURLMock = jest.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });

    try {
      fireEvent.click(screen.getByRole('button', { name: /export html/i }));

      expect(clickMock).toHaveBeenCalledTimes(1);
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:export');
      expect(anchor.download).toBe('title.html');
      expect(exportedBlob).not.toBeNull();

      const html = await readBlob(exportedBlob!);
      expect(html).toContain('<meta name="generator" content="Kali Linux Portfolio Markdown Editor" />');
      expect(html).toContain('<style>');
      expect(html).toContain('color-scheme:dark');
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<p>Paragraph with <strong>bold</strong> text.</p>');
      expect(html).not.toContain('<script>');
    } finally {
      createElementSpy.mockRestore();
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevokeObjectURL,
      });
    }
  });
});
