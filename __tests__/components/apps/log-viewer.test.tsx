import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LogViewer from '../../../components/apps/log-viewer';

jest.mock('../../../components/HelpPanel', () => () => null);

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: { children: ({ height, width }: { height: number; width: number }) => React.ReactNode }) =>
    children({ height: 600, width: 800 }),
}));

jest.mock('react-window', () => {
  const React = require('react');
  return {
    FixedSizeList: ({ itemCount, itemData, children, itemKey }: any) => (
      <div data-testid="virtualized-list">
        {Array.from({ length: itemCount }).map((_, index) =>
          React.createElement(children, {
            index,
            style: {},
            data: itemData,
            key: itemKey ? itemKey(index, itemData) : index,
          })
        )}
      </div>
    ),
  };
});

const OriginalBlob = global.Blob;

beforeAll(() => {
  class TextBlob {
    private data: string;

    constructor(parts: any[]) {
      this.data = parts
        .map((part) => (typeof part === 'string' ? part : ''))
        .join('');
    }

    text() {
      return Promise.resolve(this.data);
    }
  }

  // @ts-ignore
  global.Blob = TextBlob as any;
});

afterAll(() => {
  // @ts-ignore
  global.Blob = OriginalBlob;
});

describe('LogViewer', () => {
  beforeEach(() => {
    window.localStorage?.clear();
    jest.restoreAllMocks();
  });

  it('renders the log list with filter controls', () => {
    render(<LogViewer />);

    expect(screen.getAllByTestId('log-row').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Source')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export view' })).toBeInTheDocument();
  });

  it('persists and reapplies saved filter presets', () => {
    render(<LogViewer />);

    fireEvent.click(screen.getByRole('button', { name: 'ERROR' }));
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'payments' } });
    fireEvent.change(screen.getByLabelText('Save current filters as'), { target: { value: 'Payment errors' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));

    const stored = window.localStorage.getItem('log-viewer-presets-v1');
    expect(stored).toContain('Payment errors');

    fireEvent.click(screen.getByRole('button', { name: 'ERROR' }));
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: '' } });

    const presetSelect = screen.getByLabelText('Preset');
    const presetOption = within(presetSelect).getByRole('option', { name: 'Payment errors' }) as HTMLOptionElement;
    fireEvent.change(presetSelect, { target: { value: presetOption.value } });

    expect(screen.getByText('Applied preset: Payment errors')).toBeInTheDocument();
    expect((screen.getByLabelText('Source') as HTMLInputElement).value).toBe('payments');
  });

  it('exports the current filtered view with metadata', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    let capturedBlob: Blob | null = null;
    const createObjectURL = jest.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<LogViewer />);

    fireEvent.click(screen.getByRole('button', { name: 'ERROR' }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'timeout' } });
    fireEvent.click(screen.getByRole('button', { name: /Export view/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalled();

    const blob = capturedBlob as Blob;
    const exportedText = await (blob as any).text();
    const payload = JSON.parse(exportedText);

    expect(payload.appliedFilters.message).toBe('timeout');
    expect(payload.total).toBeGreaterThan(0);
    expect(payload.logs.every((entry: { level: string }) => entry.level === 'ERROR')).toBe(true);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    Object.assign(URL, { createObjectURL: originalCreateObjectURL, revokeObjectURL: originalRevokeObjectURL });
  });
});
