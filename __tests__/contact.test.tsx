import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Contact from '../components/apps/contact';

describe('Contact app', () => {
  beforeEach(() => {
    (navigator as any).clipboard = { writeText: jest.fn() };
    (window as any).open = jest.fn();
  });

  it('blocks invalid email', () => {
    render(<Contact />);
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText('message'), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect((navigator as any).clipboard.writeText).not.toHaveBeenCalled();
    expect(screen.queryByText(/Message copied to clipboard!/i)).not.toBeInTheDocument();
  });

  it('copies full message on success', () => {
    render(<Contact />);
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText('message'), { target: { value: 'Hello there' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    const expected = 'Name: Alex\nEmail: alex@example.com\n\nHello there';
    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith(expected);
    expect(screen.getByText(/Message copied to clipboard!/i)).toBeInTheDocument();
  });
});
