import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

  it('filters when clicking stack chip inside a project', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Alpha');
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

  it('compares two projects side-by-side', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Alpha');
    fireEvent.click(
      screen.getByRole('button', { name: 'Select Alpha for comparison' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Select Beta for comparison' })
    );
    const table = await screen.findByRole('table');
    const tbl = within(table);
    expect(tbl.getByText('Alpha')).toBeInTheDocument();
    expect(tbl.getByText('Beta')).toBeInTheDocument();
    expect(tbl.getByText('Stack')).toBeInTheDocument();
    expect(tbl.getByText('Highlights')).toBeInTheDocument();
    expect(tbl.getByText('JS')).toBeInTheDocument();
    expect(tbl.getByText('TS')).toBeInTheDocument();
    expect(tbl.getByText('frontend, react')).toBeInTheDocument();
    expect(tbl.getByText('backend')).toBeInTheDocument();
  });
});
