import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import Gedit from '../components/apps/gedit';

jest.mock('react-ga4', () => ({ event: jest.fn() }));
const init = jest.fn();
const send = jest.fn();
jest.mock('@emailjs/browser', () => ({ init: (...args: any[]) => init(...args), send: (...args: any[]) => send(...args) }));

describe('Gedit component', () => {
  beforeEach(() => {
    init.mockClear();
    send.mockClear();
    process.env.NEXT_PUBLIC_SERVICE_ID = 'service';
    process.env.NEXT_PUBLIC_TEMPLATE_ID = 'template';
    process.env.NEXT_PUBLIC_USER_ID = 'user';
  });

  it('sends message when fields are valid', async () => {
    send.mockResolvedValueOnce({});
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText('Your Email / Name :'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/subject/), { target: { value: 'Hi' } });
    fireEvent.change(screen.getByPlaceholderText('Message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(send).toHaveBeenCalled());
  });

  it('does not send when name is empty', () => {
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText('Message'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Send'));
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText('Name must not be empty')).toBeInTheDocument();
  });
});
