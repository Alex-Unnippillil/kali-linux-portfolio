import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Autopsy from '../components/apps/autopsy';

describe('Autopsy demo dataset', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            caseName: 'Sample',
            files: [
              {
                path: 'documents/evidence.txt',
                content: 'This file contains evidence of the breach.',
                timestamp: '2023-06-01T10:00:00Z',
                hash: 'abc123',
              },
            ],
          }),
      })
    );
  });

  it('renders file tree and timeline', async () => {
    render(<Autopsy />);
    await screen.findByText('File Tree');
    await screen.findByText('Timeline');
  });

  it('searches by hash and keyword', async () => {
    render(<Autopsy />);
    await screen.findByText('File Tree');
    fireEvent.change(screen.getByPlaceholderText('Hash lookup'), {
      target: { value: 'abc123' },
    });
    fireEvent.click(screen.getByText('Find'));
    await screen.findByText(/abc123/);
    fireEvent.change(screen.getByPlaceholderText('Keyword search'), {
      target: { value: 'breach' },
    });
    fireEvent.click(screen.getByText('Search'));
    const hits = await screen.findAllByText('documents/evidence.txt');
    expect(hits.length).toBeGreaterThan(0);
  });
});
