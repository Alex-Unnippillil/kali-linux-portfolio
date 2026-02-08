import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFoundPage from '../pages/404';

jest.mock('../components/ubuntu', () => function Ubuntu() {
  return <div />;
});
jest.mock('../components/BetaBadge', () => function BetaBadge() {
  return <div />;
});
jest.mock('../components/InstallButton', () => function InstallButton() {
  return <div />;
});

describe('404 page', () => {
  it('renders command not found message and help link', () => {
    render(<NotFoundPage />);
    expect(screen.getByText(/command not found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument();
  });
});
