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
              name: 'Repo1',
              description: 'desc1',
              language: 'JS',
              homepage: '',
              html_url: 'url1',
            },
            {
              id: 2,
              name: 'Repo2',
              description: 'desc2',
              language: 'TS',
              homepage: '',
              html_url: 'url2',
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
    await waitFor(() => screen.getByText('Repo1'));
    fireEvent.click(screen.getAllByRole('button', { name: 'TS' })[0]);
    await waitFor(() =>
      expect(screen.queryByText('Repo1')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'Showing 1 project filtered by TS'
    );
  });

  it('filters when clicking tag chip inside a project', async () => {
    render(<ProjectGallery />);
    await waitFor(() => screen.getByText('Repo1'));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'JS' })[1] // chip inside Repo1
    );
    await waitFor(() =>
      expect(screen.queryByText('Repo2')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'Showing 1 project filtered by JS'
    );
  });

  it('updates hash when opening project details', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Repo1');
    fireEvent.click(screen.getAllByText('Details')[0]);
    await screen.findByRole('dialog');
    expect(window.location.hash).toBe('#1');
    window.location.hash = '';
  });
});
