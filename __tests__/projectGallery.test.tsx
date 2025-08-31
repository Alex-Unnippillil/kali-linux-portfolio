import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectGallery from '../components/apps/project-gallery';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

describe('ProjectGallery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('filters projects and updates live region', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Alpha');
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

  it('filters projects by selected tags', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Alpha');
    fireEvent.click(screen.getByLabelText('frontend'));
    await waitFor(() =>
      expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'Showing 1 project with tags frontend'
    );
  });

  it('persists filter selection to localStorage', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Alpha');
    fireEvent.change(screen.getByLabelText('Stack'), {
      target: { value: 'TS' },
    });
    fireEvent.click(screen.getByLabelText('frontend'));
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('project-gallery-filters') || '{}'
      );
      expect(stored.stack).toBe('TS');
      expect(stored.tags).toEqual(['frontend']);
    });
  });

  it('loads persisted filters from localStorage', async () => {
    localStorage.setItem(
      'project-gallery-filters',
      JSON.stringify({ search: '', stack: 'TS', year: '', type: '', tags: [] })
    );
    render(<ProjectGallery />);
    await screen.findByText('Beta');
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('shortlists projects and persists to localStorage', async () => {
    render(<ProjectGallery />);
    const btn = await screen.findAllByLabelText('Add to shortlist');
    fireEvent.click(btn[0]);
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('shortlistedProjects') || '[]'
      );
      expect(stored).toContain(1);
    });
  });
});
