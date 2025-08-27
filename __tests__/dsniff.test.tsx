import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Dsniff from '../components/apps/dsniff';

describe('Dsniff component', () => {
  it('shows fixture logs', async () => {
    render(<Dsniff />);
    expect(await screen.findByText('example.com')).toBeInTheDocument();
    expect(await screen.findByText('test.com')).toBeInTheDocument();
  });

  it('applies host filter', async () => {
    render(<Dsniff />);
    await screen.findByText('example.com');

    fireEvent.change(screen.getByPlaceholderText('Value'), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getAllByText(/example.com/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/test.com/)).toBeNull();
  });
});

