import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectGallery from '../components/apps/project-gallery';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

describe('ProjectGallery', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve([
            {
              id: 1,
              title: 'Alpha',
              description: 'desc1',
              stack: ['JS'],
              year: 2021,
              type: 'web',
              thumbnail: '',
              repo: 'r1',
              demo: 'd1',
            },
            {
              id: 2,
              title: 'Beta',
              description: 'desc2',
              stack: ['TS'],
              year: 2022,
              type: 'app',
              thumbnail: '',
              repo: 'r2',
              demo: 'd2',
            },
          ]),
      })
    );
  });

  afterEach(() => {
    // @ts-ignore
    fetch.mockClear();
  });

  it('filters projects and updates live region', async () => {
    render(<ProjectGallery />);
    await waitFor(() => screen.getByText('Alpha'));
    fireEvent.change(screen.getByLabelText('Stack'), {
      target: { value: 'TS' },
    });
    await waitFor(() =>
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'Showing 1 project filtered by TS'
    );
  });

  it('filters when clicking tag chip inside a project', async () => {
    render(<ProjectGallery />);
    await waitFor(() => screen.getByText('Alpha'));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'JS' })[0] // chip inside Alpha
    );
    await waitFor(() =>
      expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'Showing 1 project filtered by JS'
    );
  });
});
