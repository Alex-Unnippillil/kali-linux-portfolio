import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImportAnnotate from '../components/apps/ghidra/ImportAnnotate';

function createPeSample(): File {
  const buffer = new ArrayBuffer(512);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  bytes[0] = 0x4d;
  bytes[1] = 0x5a;
  view.setUint32(0x3c, 0x80, true);
  view.setUint32(0x80, 0x00004550, false);
  view.setUint16(0x80 + 6, 1, true);
  view.setUint16(0x80 + 20, 0xe0, true);
  const sectionTable = 0x80 + 24 + 0xe0;
  const name = '.text';
  for (let i = 0; i < name.length; i += 1) {
    bytes[sectionTable + i] = name.charCodeAt(i);
  }
  const file = new File([bytes], 'sample.exe', { type: 'application/octet-stream' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => buffer,
  });
  return file;
}

function createUnsupportedSample(): File {
  const buffer = new ArrayBuffer(4);
  const bytes = new Uint8Array(buffer);
  bytes.set([0x25, 0x50, 0x44, 0x46]);
  const file = new File([bytes], 'report.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => buffer,
  });
  return file;
}

describe('ImportAnnotate', () => {
  it('announces guidance for supported PE uploads', async () => {
    render(<ImportAnnotate />);
    const input = screen.getByLabelText(/upload pe, elf, or raw binary/i);
    const file = createPeSample();

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Portable Executable detected/i)
      ).toBeInTheDocument();
    });
  });

  it('shows next steps for unsupported uploads', async () => {
    render(<ImportAnnotate />);
    const input = screen.getByLabelText(/upload pe, elf, or raw binary/i);
    const file = createUnsupportedSample();

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't recognise this format/i)
      ).toBeInTheDocument();
    });
  });
});
