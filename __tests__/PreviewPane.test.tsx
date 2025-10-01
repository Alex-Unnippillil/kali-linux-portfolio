import { Buffer } from 'buffer';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import PreviewPane from '../components/apps/autopsy/PreviewPane';
import type { PreviewPaneFile } from '../components/apps/autopsy/preview-utils';

jest.mock('../components/apps/autopsy/preview-utils', () => {
  const actual = jest.requireActual('../components/apps/autopsy/preview-utils');
  return {
    ...actual,
    decodeBase64Fully: jest.fn().mockResolvedValue(new Uint8Array([65, 10, 66])),
    bytesToHex: actual.bytesToHex,
  };
});

describe('PreviewPane', () => {
  const baseFile: PreviewPaneFile = {
    name: 'notes.txt',
    base64: Buffer.from('Hello world').toString('base64'),
    previewText: 'Hello world',
    previewHex: '00000000  48 65 6c 6c 6f 20 77 6f 72 6c 64     Hello world',
    truncated: true,
    isBinary: false,
    previewByteLength: 11,
    totalBytes: 20,
    isImage: false,
    mimeType: undefined,
    hash: '',
    known: null,
  };

  it('renders truncated message and toggles expanded view', async () => {
    render(<PreviewPane file={baseFile} />);

    expect(
      screen.getByText(/Showing the first/i),
    ).toHaveTextContent('Showing the first 11 B of approximately 20 B');

    const button = screen.getByRole('button', { name: /View full file/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    const status = screen.getByRole('status');
    expect(status.textContent).toMatch(/Full file/);
  });

  it('defaults to hex mode for binary payloads', () => {
    const binaryFile: PreviewPaneFile = {
      ...baseFile,
      isBinary: true,
      previewText: '',
      previewHex: 'hex-data',
    };

    render(<PreviewPane file={binaryFile} />);

    expect(screen.getByRole('button', { name: /Hex/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
