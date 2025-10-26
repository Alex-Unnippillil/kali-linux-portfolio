import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Autopsy from '../components/apps/autopsy';
import fileTree from '../public/demo-data/autopsy/filetree.json';

describe('Autopsy plugins and timeline', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url === '/plugin-marketplace.json') {
        return Promise.resolve({
          json: () =>
            Promise.resolve([{ id: 'hash', name: 'Hash Analyzer' }]),
        });
      }
      if (url === '/autopsy-demo.json') {
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
      if (url === '/demo-data/autopsy/filetree.json') {
        return Promise.resolve({
          json: () => Promise.resolve(JSON.parse(JSON.stringify(fileTree))),
        });
      }
      if (url === '/demo-data/autopsy/hashes.json') {
        return Promise.resolve({ json: () => Promise.resolve({}) });
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
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'hash' } });
    await waitFor(() =>
      expect((selects[0] as HTMLSelectElement).value).toBe('hash')
    );
  });

  it('filters artifacts by type', async () => {
    render(<Autopsy />);
    fireEvent.change(screen.getByPlaceholderText('Case name'), {
      target: { value: 'Demo' },
    });
    fireEvent.click(screen.getByText('Create Case'));
    await screen.findByLabelText('Filter by type');
    expect(screen.getByText('resume.docx')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by type'), {
      target: { value: 'Log' },
    });
    expect(screen.queryByText('resume.docx')).toBeNull();
    expect(screen.getByText('system.log')).toBeInTheDocument();
  });

  it('displays EXIF metadata for JPEG selections', async () => {
    render(<Autopsy />);
    fireEvent.change(screen.getByPlaceholderText('Case name'), {
      target: { value: 'Demo Case' },
    });
    fireEvent.click(screen.getByText('Create Case'));
    await screen.findByText('File Explorer');
    fireEvent.click(screen.getByText('investigation-photo.jpg'));
    await waitFor(() => expect(screen.getByText('Metadata')).toBeInTheDocument());
    expect(screen.getByText('Canon')).toBeInTheDocument();
    expect(screen.getByText('EOS80D')).toBeInTheDocument();
    expect(screen.getByText('37.775000')).toBeInTheDocument();
    expect(screen.getByText('-122.416667')).toBeInTheDocument();
  });

  it('parses PDF metadata when selecting case notes', async () => {
    render(<Autopsy />);
    fireEvent.change(screen.getByPlaceholderText('Case name'), {
      target: { value: 'Demo Case' },
    });
    fireEvent.click(screen.getByText('Create Case'));
    await screen.findByText('File Explorer');
    fireEvent.click(screen.getByText('case-notes.pdf'));
    await waitFor(() =>
      expect(screen.getByText('Incident Report')).toBeInTheDocument()
    );
    expect(screen.getByText('Forensic Analyst')).toBeInTheDocument();
  });
});
