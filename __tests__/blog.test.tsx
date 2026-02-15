import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BlogPage from '../pages/blog';

describe('BlogPage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/blog');
  });

  it('filters posts and updates query params', () => {
    render(<BlogPage />);
    expect(screen.getByText('Intro to Kali Tools')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'guide' }));
    expect(screen.queryByText('UI/UX Notes')).not.toBeInTheDocument();
    expect(window.location.search).toBe('?tag=guide');
  });

  it('restores posts on back navigation', () => {
    render(<BlogPage />);
    fireEvent.click(screen.getByRole('button', { name: 'guide' }));
    expect(window.location.search).toBe('?tag=guide');
    act(() => {
      window.history.pushState({}, '', '/blog');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(window.location.search).toBe('');
    expect(screen.getByText('UI/UX Notes')).toBeInTheDocument();
  });
});
