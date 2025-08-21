import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Gedit from '../components/apps/gedit';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

describe('Gedit component', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  it('sends message when fields are valid', async () => {
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText('Your Email / Name :'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/subject/), { target: { value: 'Hi' } });
    fireEvent.change(screen.getByPlaceholderText('Message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it('does not send when name is empty', () => {
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText('Message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Name must not be Empty!')).toBeInTheDocument();
  });
});
