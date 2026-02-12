import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PcapViewer from '../apps/wireshark/components/PcapViewer';
import captureTemplates from '../apps/wireshark/templates';
import {
  deserializeCapture,
  serializeCapture,
} from '../utils/network/packetSerializer';

describe('PcapViewer JSON export/import flows', () => {
  const template = captureTemplates.handshake;
  const rawJson = JSON.stringify(template, null, 2);
  const canonical = serializeCapture(deserializeCapture(rawJson));
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let anchorClickSpy: jest.SpyInstance;
  const createJsonFile = (contents: string, name = 'capture.json') => {
    const file = new File([contents], name, { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: () => Promise.resolve(contents),
    });
    return file;
  };

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:mock-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
    anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalCreate) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreate,
      });
    } else {
      delete (URL as any).createObjectURL;
    }
    if (originalRevoke) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevoke,
      });
    } else {
      delete (URL as any).revokeObjectURL;
    }
    anchorClickSpy.mockRestore();
  });

  it('shows an error when exporting without packets', async () => {
    const user = userEvent.setup();
    render(<PcapViewer showLegend={false} />);

    await user.click(screen.getByRole('button', { name: /export json/i }));

    expect(
      screen.getByText('No packets available to export.')
    ).toBeInTheDocument();
  });

  it('exports packets and verifies identical imports', async () => {
    const user = userEvent.setup();
    render(<PcapViewer showLegend={false} />);

    const importInput = screen.getByLabelText(/import capture json/i);
    const initialFile = createJsonFile(rawJson);

    fireEvent.change(importInput, { target: { files: [initialFile] } });

    await waitFor(() =>
      expect(
        screen.getByText('Imported 3 frames from JSON.')
      ).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /export json/i }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByText('Exported 3 frames to JSON.')
      ).toBeInTheDocument()
    );

    const verifyFile = createJsonFile(canonical);
    fireEvent.change(importInput, { target: { files: [verifyFile] } });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Import verified: 3 frames match the exported snapshot.'
        )
      ).toBeInTheDocument()
    );
  });

  it('rejects imports that do not match the last export', async () => {
    const user = userEvent.setup();
    render(<PcapViewer showLegend={false} />);

    const importInput = screen.getByLabelText(/import capture json/i);
    const initialFile = createJsonFile(rawJson);
    fireEvent.change(importInput, { target: { files: [initialFile] } });
    await waitFor(() =>
      expect(
        screen.getByText('Imported 3 frames from JSON.')
      ).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /export json/i }));
    await waitFor(() =>
      expect(
        screen.getByText('Exported 3 frames to JSON.')
      ).toBeInTheDocument()
    );

    const mutated = JSON.parse(canonical) as any;
    mutated.frames[0].info = 'tampered';
    const tamperedJson = JSON.stringify(mutated, null, 2);
    const tamperedFile = createJsonFile(tamperedJson);

    fireEvent.change(importInput, { target: { files: [tamperedFile] } });

    await waitFor(() =>
      expect(
        screen.getByText(
          'Imported capture does not match the last exported snapshot.'
        )
      ).toBeInTheDocument()
    );
  });
});
