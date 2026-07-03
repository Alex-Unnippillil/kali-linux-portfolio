import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from '../pages/404';
import ServerError from '../pages/500';

describe('error pages', () => {
  it('404 page provides navigation and details', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: /Page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Projects/i })).toHaveAttribute('href', '/apps/project-gallery');
    expect(screen.getByRole('link', { name: /Contact/i })).toHaveAttribute('href', '/apps/contact');
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
  });

  it('500 page provides navigation and details', () => {
    render(<ServerError />);
    expect(screen.getByRole('heading', { name: /Something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Projects/i })).toHaveAttribute('href', '/apps/project-gallery');
    expect(screen.getByRole('link', { name: /Contact/i })).toHaveAttribute('href', '/apps/contact');
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
  });
});
