import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectGallery from '../components/apps/project-gallery';

jest.mock('react-ga4', () => ({ event: jest.fn() }));
jest.mock('@monaco-editor/react', () => () => <div />);

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

  it('filters when clicking tag chip inside a project', async () => {
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

  it('persists filter selection to localStorage', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Alpha');
    fireEvent.change(screen.getByLabelText('Stack'), {
      target: { value: 'TS' },
    });
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('project-gallery-filters') || '{}'
      );
      expect(stored.stack).toBe('TS');
    });
  });

  it('loads persisted filters from localStorage', async () => {
    localStorage.setItem(
      'project-gallery-filters',
      JSON.stringify({ search: '', stack: 'TS', tag: '', year: '', type: '' })
    );
    render(<ProjectGallery />);
    await screen.findByText('Beta');
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('filters projects by tag', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Alpha');
    fireEvent.change(screen.getByLabelText('Tag'), {
      target: { value: 'beta' },
    });
    await waitFor(() =>
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'tagged with beta'
    );
  });
});
