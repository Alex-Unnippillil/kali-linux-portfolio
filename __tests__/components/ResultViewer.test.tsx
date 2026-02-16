import { fireEvent, render, screen, within } from '@testing-library/react';

import ResultViewer from '../../components/ResultViewer';

describe('ResultViewer', () => {
  const createUrlSpies = () => {
    const click = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement('a');
    (anchor as unknown as { click: () => void }).click = click;
    const createElement = jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string, options?: ElementCreationOptions) => {
        if (tagName === 'a') {
          return anchor;
        }
        return originalCreateElement(tagName, options);
      });
    const createObjectURL = jest.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = jest.fn();
    const originalBlob = window.Blob;
    class MockBlob {
      private readonly parts: unknown[];

      constructor(parts: unknown[], _options?: BlobPropertyBag) {
        this.parts = parts;
      }

      text() {
        return Promise.resolve(
          this.parts
            .map((part) => (typeof part === 'string' ? part : String(part)))
            .join(''),
        );
      }
    }
    (window as any).Blob = MockBlob as unknown as typeof Blob;
    const originalCreateObjectURL = (window.URL as any).createObjectURL;
    const originalRevokeObjectURL = (window.URL as any).revokeObjectURL;
    (window.URL as any).createObjectURL = createObjectURL;
    (window.URL as any).revokeObjectURL = revokeObjectURL;
    const restore = () => {
      if (originalCreateObjectURL) {
        (window.URL as any).createObjectURL = originalCreateObjectURL;
      } else {
        delete (window.URL as any).createObjectURL;
      }
      if (originalRevokeObjectURL) {
        (window.URL as any).revokeObjectURL = originalRevokeObjectURL;
      } else {
        delete (window.URL as any).revokeObjectURL;
      }
      (window as any).Blob = originalBlob;
    };
    return { anchor, click, createElement, createObjectURL, restore, revokeObjectURL };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts in parsed mode when defaultTab is parsed', () => {
    render(<ResultViewer data={[{ foo: 'alpha' }]} defaultTab="parsed" />);

    expect(screen.getByRole('columnheader', { name: 'foo' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'alpha' })).toBeInTheDocument();
  });

  it('preloads defaultFilter and narrows rows', () => {
    const data = [
      { foo: 'keep-me' },
      { foo: 'drop-me' },
    ];

    render(<ResultViewer data={data} defaultTab="parsed" defaultFilter="keep" />);

    const filterInput = screen.getByLabelText(/filter rows/i) as HTMLInputElement;
    expect(filterInput.value).toBe('keep');

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByRole('cell', { name: 'keep-me' })).toBeInTheDocument();
  });

  it('renders object values as JSON in parsed mode', () => {
    const data = [{ foo: { nested: 'value' } }];

    render(<ResultViewer data={data} defaultTab="parsed" />);

    expect(screen.getByRole('cell', { name: '{"nested":"value"}' })).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('renders headers and cells for keys discovered in later rows', () => {
    const data = [
      { foo: 'alpha', bar: 'beta' },
      { foo: 'gamma', baz: 'delta' },
    ];

    render(<ResultViewer data={data} />);

    fireEvent.click(screen.getByRole('tab', { name: /parsed/i }));

    const header = screen.getByRole('columnheader', { name: 'baz' });
    expect(header).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1); // exclude header row
    const firstRowCells = within(rows[0]).getAllByRole('cell');
    expect(firstRowCells).toHaveLength(3);
    expect(firstRowCells[2].textContent).toBe('');

    const secondRowCells = within(rows[1]).getAllByRole('cell');
    expect(secondRowCells[2].textContent).toBe('delta');
  });

  it('includes expanded columns in the exported CSV', async () => {
    const data = [
      { foo: 'alpha', bar: 1 },
      { foo: 'beta', baz: 2 },
    ];

    render(<ResultViewer data={data} />);

    fireEvent.click(screen.getByRole('tab', { name: /parsed/i }));

    const spies = createUrlSpies();

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    try {
      expect(spies.createObjectURL).toHaveBeenCalledTimes(1);
      const blobArg = spies.createObjectURL.mock.calls[0][0] as Blob;
      const csv = await blobArg.text();

      expect(csv.split('\n')[0]).toBe('foo,bar,baz');
      expect(csv).toContain('"alpha",1,""');
      expect(csv).toContain('"beta","",2');
      expect(spies.click).toHaveBeenCalled();
      expect(spies.createElement).toHaveBeenCalledWith('a');
      expect(spies.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    } finally {
      spies.restore();
    }
  });
});
