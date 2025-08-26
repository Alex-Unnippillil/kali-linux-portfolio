import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Autopsy from '../components/apps/autopsy';

describe('Autopsy plugins and timeline', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve([{ id: 'hash', name: 'Hash Analyzer' }]),
      })
    );
    class FileReaderMock {
      onload: ((e: any) => void) | null = null;
      readAsArrayBuffer() {
        const buffer = new ArrayBuffer(20);
        this.onload && this.onload({ target: { result: buffer } });
      }
    }
    // @ts-ignore
    global.FileReader = FileReaderMock;
  });

  it('loads plugins from marketplace', async () => {
    render(<Autopsy />);
    fireEvent.change(screen.getByPlaceholderText('Case name'), {
      target: { value: 'Demo' },
    });
    fireEvent.click(screen.getByText('Create Case'));
    await screen.findByText('Hash Analyzer');
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'hash' } });
    await waitFor(() =>
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe(
        'hash'
      )
    );
  });

  it('renders artifact on timeline after file upload', async () => {
    render(<Autopsy />);
    fireEvent.change(screen.getByPlaceholderText('Case name'), {
      target: { value: 'Demo' },
    });
    fireEvent.click(screen.getByText('Create Case'));
    await screen.findByRole('combobox');
    const file = new File([new Uint8Array(20)], 'test.bin', {
      type: 'application/octet-stream',
    });
    fireEvent.change(screen.getByLabelText('Upload file'), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(screen.getAllByText(/test.bin/).length).toBeGreaterThan(0)
    );
  });
});
