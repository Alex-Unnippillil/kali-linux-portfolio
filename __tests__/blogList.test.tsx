import React from 'react';
import { render, screen } from '@testing-library/react';
import BlogList from '../components/BlogList';

jest.mock('../data/blog-posts.json', () => [
  { id: 1, title: 'Test Post', summary: 'Summary', url: '#' },
]);

describe('BlogList', () => {
  it('shows skeleton then loads posts', async () => {
    render(<BlogList />);
    expect(screen.getByTestId('blog-skeleton')).toBeInTheDocument();
    const post = await screen.findByText('Test Post');
    expect(post).toBeInTheDocument();
  });
});
