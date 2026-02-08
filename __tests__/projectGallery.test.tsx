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
    fireEvent.click(screen.getByRole('tab', { name: /All/i }));
    await waitFor(() => {
      expect(screen.getByText('Recipe App')).toBeInTheDocument();
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
    const featuredBadges = screen.getAllByText('⭐');
    expect(featuredBadges.length).toBeGreaterThan(0);
  });

  it('displays technology stack tags', async () => {
    render(<ProjectGallery />);
    await screen.findByText('Kali Linux Portfolio');
    // Check for featured star emoji
    const featuredBadges = screen.getAllByText('⭐');
    expect(featuredBadges.length).toBeGreaterThan(0);

    // Should show stack tags
    expect(screen.getAllByText('Next.js').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TypeScript').length).toBeGreaterThan(0);
  });
});
