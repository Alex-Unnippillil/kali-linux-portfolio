import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectGallery from '../components/apps/project-gallery';

describe('ProjectGallery', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders project cards', async () => {
    render(<ProjectGallery />);
    expect(await screen.findByText('Kali Linux Portfolio')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('filters projects by search', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');

    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'Recipe' } });

    await waitFor(() => {
      expect(screen.getByText('Recipe App')).toBeInTheDocument();
      expect(screen.queryByText('Kali Linux Portfolio')).not.toBeInTheDocument();
    });
  });

  it('filters projects by category', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');

    // Click on Games category
    fireEvent.click(screen.getByRole('tab', { name: /Games/i }));

    await waitFor(() => {
      expect(screen.getByText('Flappy Bird')).toBeInTheDocument();
      expect(screen.queryByText('Recipe App')).not.toBeInTheDocument();
    });
  });

  it('shows all projects when All category is selected', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');

    // First filter by category
    fireEvent.click(screen.getByRole('tab', { name: /Games/i }));
    await waitFor(() => {
      expect(screen.queryByText('Recipe App')).not.toBeInTheDocument();
    });

    // Then click All
    fireEvent.click(screen.getByRole('tab', { name: /All Projects/i }));
    await waitFor(() => {
      expect(screen.getByText('Recipe App')).toBeInTheDocument();
    });
  });

  it('displays stats correctly', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');

    // Check that stats are visible
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('GitHub Stars')).toBeInTheDocument();
    expect(screen.getByText('Matching')).toBeInTheDocument();
  });

  it('shows empty state when no matches', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');

    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });
  });

  it('opens demo in Firefox when demo button clicked', async () => {
    const mockOpenApp = jest.fn();
    render(<ProjectGallery openApp={mockOpenApp} />);

    await screen.findByText('Kali Linux Portfolio');

    // Find and click a demo button
    const demoButtons = screen.getAllByRole('button', { name: /demo/i });
    fireEvent.click(demoButtons[0]);

    expect(mockOpenApp).toHaveBeenCalledWith('firefox');
    expect(sessionStorage.getItem('firefox:start-url')).toBeTruthy();
  });

  it('shows featured badge on featured projects', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');

    // Featured projects should have the featured badge
    const featuredBadges = screen.getAllByText(/Featured/i);
    expect(featuredBadges.length).toBeGreaterThan(0);
  });

  it('displays technology stack tags', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');

    // Should show stack tags
    expect(screen.getAllByText('Next.js').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThan(0);
  });
});
