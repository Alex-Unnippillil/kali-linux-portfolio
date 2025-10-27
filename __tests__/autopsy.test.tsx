import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Autopsy from '../components/apps/autopsy';

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
          json: () =>
            Promise.resolve({
              name: 'root',
              children: [],
            }),
        });
      }
      if (url === '/demo-data/autopsy/hashes.json') {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              '0efd846c4a6c66f82460152159e5605aa4aeeb7eb942dc300a7c6cbd9a5a3ff4':
                'notes.txt',
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

  it('shows read-only forensic datasets with commentary', async () => {
    render(<Autopsy />);
    fireEvent.change(screen.getByPlaceholderText('Case name'), {
      target: { value: 'Demo' },
    });
    fireEvent.click(screen.getByText('Create Case'));

    const timelineGroup = await screen.findByRole('group', {
      name: /Forensic timeline dataset/i,
    });
    expect(
      within(timelineGroup).getByText(/fictional FIELD-USB investigation/i)
    ).toBeInTheDocument();
    expect(
      within(timelineGroup).getByRole('note')
    ).toHaveTextContent('Instructor insight');

    const hashGroup = await screen.findByRole('group', {
      name: /Hash set reference/i,
    });
    expect(
      within(hashGroup).getByText(/Synthetic SHA-256 values generated/i)
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(hashGroup).getByText(/Matches demo hash DB entry/i)
      ).toBeInTheDocument()
    );
  });
});
