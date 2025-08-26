import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Gedit from '../components/apps/gedit';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

describe('Gedit component', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn().mockResolvedValue({ ok: true });
    window.alert = jest.fn();
    window.open = jest.fn();
  });

  it('sends message when fields are valid', async () => {
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText('Your Email / Name :'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/subject/), { target: { value: 'Hi' } });
    fireEvent.change(screen.getByPlaceholderText('Message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  it('does not send when name is empty', () => {
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText('Message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Name must not be Empty!')).toBeInTheDocument();
  });
});
