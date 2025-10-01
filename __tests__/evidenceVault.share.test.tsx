import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import EvidenceVaultApp from '../components/apps/evidence-vault';

describe('EvidenceVault sharing', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalNavigatorShare = navigator.share;
  const originalNavigatorCanShare = navigator.canShare;

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: jest.fn(() => 'blob:mock-url'),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: jest.fn(),
      configurable: true,
      writable: true,
    });
    delete (navigator as any).share;
    delete (navigator as any).canShare;
  });

  afterEach(() => {
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        value: originalCreateObjectURL,
        configurable: true,
        writable: true,
      });
    } else {
      delete (URL as any).createObjectURL;
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: originalRevokeObjectURL,
        configurable: true,
        writable: true,
      });
    } else {
      delete (URL as any).revokeObjectURL;
    }
    if (originalNavigatorShare) {
      (navigator as any).share = originalNavigatorShare;
    } else {
      delete (navigator as any).share;
    }
    if (originalNavigatorCanShare) {
      (navigator as any).canShare = originalNavigatorCanShare;
    } else {
      delete (navigator as any).canShare;
    }
    jest.restoreAllMocks();
  });

  it('opens the share sheet for selected notes', async () => {
    const shareFn = jest.fn().mockResolvedValue(undefined);
    (navigator as any).share = shareFn;

    render(
      <EvidenceVaultApp
        initialItems={[
          {
            id: 1,
            type: 'note',
            title: 'Forensics Lead',
            content: 'Disk image hash verified.',
            tags: [],
            createdAt: Date.now(),
          },
        ]}
      />
    );

    fireEvent.click(screen.getByLabelText('Select Forensics Lead'));
    fireEvent.click(screen.getByRole('button', { name: 'Share Selected' }));

    await waitFor(() => expect(shareFn).toHaveBeenCalled());
    expect(await screen.findByText(/Shared successfully/i)).toBeInTheDocument();
  });

  it('falls back to a JSON download when sharing is unsupported', async () => {
    const downloadClick = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a');
        jest.spyOn(anchor, 'click').mockImplementation(downloadClick);
        return anchor;
      }
      return originalCreateElement(tagName);
    });

    render(
      <EvidenceVaultApp
        initialItems={[
          {
            id: 2,
            type: 'file',
            name: 'capture.pcap',
            tags: [],
            dataUrl: 'data:application/octet-stream;base64,AAEC',
            mimeType: 'application/octet-stream',
            size: 4,
            objectUrl: 'blob:existing',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByLabelText('Select capture.pcap'));
    fireEvent.click(screen.getByRole('button', { name: 'Share Selected' }));

    await waitFor(() => expect(downloadClick).toHaveBeenCalled());
    expect(
      await screen.findByText(/Downloaded a JSON bundle instead/i)
    ).toBeInTheDocument();
  });
});
