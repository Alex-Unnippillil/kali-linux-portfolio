import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BeefDocs from '../components/apps/beef';

describe('BeEF docs page', () => {
  it('renders instructional content and disclaimer', () => {
    render(<BeefDocs />);
    expect(
      screen.getByText(/Browser Exploitation Framework/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/explicit permission to test/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Open official docs')).toBeInTheDocument();
    expect(screen.queryByTitle('BeEF Documentation')).toBeNull();
  });

  it('mounts iframe only after user clicks button', () => {
    render(<BeefDocs />);
    fireEvent.click(screen.getByText('Open official docs'));
    expect(screen.getByTitle('BeEF Documentation')).toBeInTheDocument();
  });
});
