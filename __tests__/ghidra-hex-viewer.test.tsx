import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HexViewer from '../components/apps/ghidra/HexViewer';

const SAMPLE_DATA = {
  lines: [
    { offset: 0, hex: '66 6f 6f', ascii: 'foo', sourceLine: 0 },
    { offset: 16, hex: '62 61 72', ascii: 'bar', sourceLine: 1 },
    { offset: 32, hex: '66 6f 6f', ascii: 'foo', sourceLine: 2 },
  ],
  totalBytes: 48,
  done: true,
};

describe('HexViewer search navigation', () => {
  it('wraps forward search results when reaching the end', async () => {
    const user = userEvent.setup();
    const onAnchorChange = jest.fn();
    render(
      <HexViewer
        data={SAMPLE_DATA}
        caret={{ line: null, offset: null }}
        onAnchorChange={onAnchorChange}
        loading={false}
      />
    );

    const input = screen.getByPlaceholderText(/find/i);
    await user.type(input, 'foo');
    await waitFor(() => expect(onAnchorChange).toHaveBeenCalled());
    onAnchorChange.mockClear();

    const nextButton = screen.getByRole('button', { name: /find next/i });
    await user.click(nextButton);
    expect(onAnchorChange).toHaveBeenLastCalledWith({ line: 2, offset: 32 });

    await user.click(nextButton);
    expect(onAnchorChange).toHaveBeenLastCalledWith({ line: 0, offset: 0 });
  });

  it('wraps backward search results when reaching the beginning', async () => {
    const user = userEvent.setup();
    const onAnchorChange = jest.fn();
    render(
      <HexViewer
        data={SAMPLE_DATA}
        caret={{ line: null, offset: null }}
        onAnchorChange={onAnchorChange}
        loading={false}
      />
    );

    const input = screen.getByPlaceholderText(/find/i);
    await user.type(input, 'foo');
    await waitFor(() => expect(onAnchorChange).toHaveBeenCalled());
    onAnchorChange.mockClear();

    const prevButton = screen.getByRole('button', { name: /find previous/i });
    await user.click(prevButton);
    expect(onAnchorChange).toHaveBeenLastCalledWith({ line: 2, offset: 32 });
  });
});
