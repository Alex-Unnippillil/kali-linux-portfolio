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
    fireEvent.change(screen.getByPlaceholderText('Your Email / Name :'), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByPlaceholderText(/subject/i), {
      target: { value: 'Hi' },
    });
    fireEvent.change(screen.getByPlaceholderText('Message'), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Message sent');
  });

  it('does not send when name is empty', () => {
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText(/subject/i), {
      target: { value: 'Hi' },
    });
    fireEvent.change(screen.getByPlaceholderText('Message'), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText('Name must not be empty')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please fix the highlighted fields.'
    );
  });

  it('shows an inline error when subject is empty', () => {
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText('Your Email / Name :'), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByPlaceholderText('Message'), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText('Subject must not be empty')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please fix the highlighted fields.'
    );
  });

  it('surfaces a friendly error when EmailJS fails', async () => {
    send.mockRejectedValueOnce(new Error('fail'));
    render(<Gedit />);
    fireEvent.change(screen.getByPlaceholderText('Your Email / Name :'), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByPlaceholderText(/subject/i), {
      target: { value: 'Hi' },
    });
    fireEvent.change(screen.getByPlaceholderText('Message'), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent('Unable to send message. Please try again.');
    expect(
      await screen.findByRole('button', { name: 'Send' })
    ).toBeEnabled();
  });
});
