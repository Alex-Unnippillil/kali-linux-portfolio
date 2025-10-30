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
  it('shows inline errors when client-side validation fails', async () => {
    render(<ContactApp />);
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: ' ' },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: ' ' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(processContactFormMock).not.toHaveBeenCalled();
    expect(await screen.findByText('Invalid email')).toBeInTheDocument();
    expect(
      screen.getByText('Please fix the errors above and try again.')
    ).toBeInTheDocument();
    expect(await screen.findByText('1-1000 chars')).toBeInTheDocument();
    const nameErrors = await screen.findAllByText('1-100 chars');
    expect(nameErrors.length).toBeGreaterThan(0);
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

  it('shows an error when reCAPTCHA fails to provide a token', async () => {
    (window as any).grecaptcha.execute.mockResolvedValueOnce('');

    render(<ContactApp />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(processContactFormMock).not.toHaveBeenCalled();
    });

    expect(
      screen.getByText('Captcha verification failed. Please try again.')
    ).toBeInTheDocument();
  });

  it('surfaces server errors returned by the API', async () => {
    processContactFormMock.mockResolvedValue({
      success: false,
      error: 'Server offline',
    });

    render(<ContactApp />);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(processContactFormMock).toHaveBeenCalled();
    });

    expect(
      screen.getByText('Server offline')
    ).toBeInTheDocument();
  });
});
