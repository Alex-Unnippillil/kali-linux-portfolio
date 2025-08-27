import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Autopsy from '../components/apps/autopsy';

describe('Autopsy plugins and timeline', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url === '/demo/plugin-marketplace.json') {
        return Promise.resolve({
          json: () =>
            Promise.resolve([{ id: 'hash', name: 'Hash Analyzer' }]),
        });
      }
      if (url === '/demo/autopsy-demo.json') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              artifacts: [
                {
                  name: 'resume.docx',
                  type: 'Document',
                  description: '',
                  size: 123,
                  plugin: 'metadata',
                  timestamp: '2023-01-01T00:00:00Z',
                },
                {
                  name: 'system.log',
                  type: 'Log',
                  description: '',
                  size: 456,
                  plugin: 'metadata',
                  timestamp: '2023-01-02T00:00:00Z',
                },
              ],
            }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve([]) });
    });
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

});
