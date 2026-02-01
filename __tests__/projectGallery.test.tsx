import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ProjectGallery from '../components/apps/project-gallery';

jest.mock('react-ga4', () => ({ event: jest.fn() }));
jest.mock('@monaco-editor/react', () => function MonacoEditorMock() {
  return <div />;
});

describe('ProjectGallery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('filters projects and updates live region', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');
    fireEvent.change(screen.getByLabelText('Stack'), {
      target: { value: 'MongoDB' },
    });
    await waitFor(() =>
      expect(screen.queryByText('Kali Linux Portfolio')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'Showing 1 project filtered by MongoDB'
    );
  });

  it('filters when clicking stack chip inside a project', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Next.js' })[0] // chip inside Kali Linux Portfolio
    );
    await waitFor(() =>
      expect(screen.queryByText('Recipe App')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'Showing 1 project filtered by Next.js'
    );
  });

  it('filters projects by selected tags', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Canada Population Growth');
    fireEvent.click(screen.getByLabelText('demographics'));
    await waitFor(() =>
      expect(screen.queryByText('Kali Linux Portfolio')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      'Showing 1 project with tags demographics'
    );
  });

  it('persists filter selection to localStorage', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Recipe App');
    fireEvent.change(screen.getByLabelText('Stack'), {
      target: { value: 'MongoDB' },
    });
    fireEvent.click(screen.getByLabelText('crud'));
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('project-gallery-filters') || '{}'
      );
      expect(stored.stack).toBe('MongoDB');
      expect(stored.tags).toEqual(['crud']);
    });
  });

  it('loads persisted filters from localStorage', async () => {
    localStorage.setItem(
      'project-gallery-filters',
      JSON.stringify({ search: '', stack: 'Python', year: '', type: '', tags: [] })
    );
    render(<ProjectGallery />);
    await screen.findByText('Snake Game');
    expect(screen.queryByText('Kali Linux Portfolio')).not.toBeInTheDocument();
  });

  it('compares two projects side-by-side', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');
    fireEvent.click(
      screen.getByRole('button', { name: 'Select Kali Linux Portfolio for comparison' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Select Recipe App for comparison' })
    );
    const table = await screen.findByRole('table');
    const tbl = within(table);
    expect(tbl.getByText('Kali Linux Portfolio')).toBeInTheDocument();
    expect(tbl.getByText('Recipe App')).toBeInTheDocument();
    expect(tbl.getByText('Stack')).toBeInTheDocument();
    expect(tbl.getByText('Highlights')).toBeInTheDocument();
    expect(tbl.getByText('Next.js, Tailwind CSS, TypeScript')).toBeInTheDocument();
    expect(tbl.getByText('Node.js, Express, MongoDB')).toBeInTheDocument();
    expect(tbl.getByText('portfolio, desktop-ui, nextjs')).toBeInTheDocument();
    expect(tbl.getByText('crud, api, recipes')).toBeInTheDocument();
  });
});
