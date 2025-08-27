import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Beef from '../components/apps/beef';

describe('BeEF docs page', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  it('renders educational content without network calls', () => {
    render(<Beef />);
    expect(
      screen.getByText(/BeEF Browser Exploitation Framework/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Legal disclaimer/i)).toBeInTheDocument();
    expect(screen.getByText(/Open official docs/i)).toBeInTheDocument();
    expect(screen.queryByTitle('BeEF Documentation')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('mounts iframe only after clicking button', () => {
    render(<Beef />);
    fireEvent.click(screen.getByText(/Open official docs/i));
    expect(screen.getByTitle('BeEF Documentation')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
