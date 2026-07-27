import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContactApp from '../apps/contact';
import { processContactForm } from '../components/apps/contact';

jest.mock('../components/apps/contact', () => ({
  processContactForm: jest.fn(),
}));

const processContactFormMock =
  processContactForm as jest.MockedFunction<typeof processContactForm>;

const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'alex@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/message/i), {
    target: { value: 'Hello from Jest' },
  });
};

beforeEach(() => {
  document.head.innerHTML =
    '<meta name="csrf-token" content="csrf-token-from-test" />';
  (window as any).grecaptcha = {
    ready: (cb: () => void) => cb(),
    execute: jest.fn().mockResolvedValue('recaptcha-token'),
  };
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
  processContactFormMock.mockReset();
  localStorage.clear();
});

describe('ContactApp UI', () => {
  it('sets mobile friendly attributes on key fields', () => {
    render(<ContactApp />);

    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveAttribute('autocomplete', 'name');
    expect(nameInput).toHaveAttribute('inputmode', 'text');
    expect(nameInput).toHaveAttribute('autocorrect', 'off');

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
    expect(emailInput).toHaveAttribute('inputmode', 'email');
    expect(emailInput).toHaveAttribute('autocorrect', 'off');

    const messageInput = screen.getByLabelText(/message/i);
    expect(messageInput).toHaveAttribute('autocomplete', 'on');
    expect(messageInput).toHaveAttribute('autocorrect', 'on');
    expect(messageInput).toHaveAttribute('inputmode', 'text');
  });

  it('shows a success toast and banner after a successful submission', async () => {
    processContactFormMock.mockResolvedValue({ success: true });

    render(<ContactApp />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(processContactFormMock).toHaveBeenCalled();
    });

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent(/message sent/i);
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/message sent/i);
  });

  it('disables the submit button and reveals a progress indicator while submitting', async () => {
    let resolveForm: ((value: { success: boolean }) => void) | undefined;
    processContactFormMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveForm = resolve;
        })
    );

    render(<ContactApp />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    const sendingButton = await screen.findByRole('button', {
      name: /sending/i,
    });
    expect(sendingButton).toBeDisabled();
    expect(
      screen.getByRole('progressbar', { name: /sending message/i })
    ).toBeInTheDocument();

    resolveForm?.({ success: true });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled();
    });
  });
});
