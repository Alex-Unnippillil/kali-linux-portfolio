import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Gedit } from '../components/apps/gedit';

const sendMock = jest.fn();
const initMock = jest.fn();

jest.mock('@emailjs/browser', () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) => initMock(...args),
    send: (...args: unknown[]) => sendMock(...args),
  },
}));

const eventMock = jest.fn();

jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    event: (...args: unknown[]) => eventMock(...args),
  },
}));

const processContactFormMock = jest.fn();

jest.mock('../components/apps/contact', () => ({
  __esModule: true,
  processContactForm: (...args: unknown[]) => processContactFormMock(...args),
}));

describe('Gedit contact integration', () => {
  const user = userEvent.setup();

  const setupFetch = () => {
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      if (typeof input === 'string' && input.startsWith('https://ipapi.co')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ latitude: 1, longitude: 2, timezone: 'UTC' }),
        }) as unknown as Response;
      }
      if (input === '/api/contact') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'csrf-token' }),
        }) as unknown as Response;
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }) as unknown as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  };

  beforeEach(() => {
    processContactFormMock.mockReset();
    sendMock.mockReset();
    initMock.mockReset();
    eventMock.mockReset();
    delete (window as any).grecaptcha;
    delete process.env.NEXT_PUBLIC_ENABLE_GEDIT_EMAILJS;
    delete process.env.NEXT_PUBLIC_USER_ID;
    delete process.env.NEXT_PUBLIC_SERVICE_ID;
    delete process.env.NEXT_PUBLIC_TEMPLATE_ID;
    delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  });

  it('submits via contact pipeline when data is valid', async () => {
    process.env.NEXT_PUBLIC_ENABLE_GEDIT_EMAILJS = 'false';
    process.env.NEXT_PUBLIC_USER_ID = '';
    process.env.NEXT_PUBLIC_SERVICE_ID = '';
    process.env.NEXT_PUBLIC_TEMPLATE_ID = '';
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'site-key';

    setupFetch();
    (window as any).grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute: () => Promise.resolve('rc-token'),
    };
    processContactFormMock.mockResolvedValue({ success: true });

    render(<Gedit />);

    await user.type(
      screen.getByPlaceholderText(
        /your email \(optionally name <email@example.com>\)/i
      ),
      'Alex <alex@example.com>'
    );
    await user.type(screen.getByPlaceholderText(/subject \(optional\)/i), 'Hi');
    await user.type(screen.getByPlaceholderText(/message/i), 'Hello from gedit');

    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(processContactFormMock).toHaveBeenCalled());

    expect(processContactFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alex',
        email: 'alex@example.com',
        message: expect.stringContaining('Hello from gedit'),
        csrfToken: 'csrf-token',
        recaptchaToken: 'rc-token',
      })
    );
    expect(sendMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
    expect(eventMock).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'api' })
    );
  });

  it('falls back to EmailJS when captcha is unavailable', async () => {
    process.env.NEXT_PUBLIC_ENABLE_GEDIT_EMAILJS = 'true';
    process.env.NEXT_PUBLIC_USER_ID = 'user';
    process.env.NEXT_PUBLIC_SERVICE_ID = 'service';
    process.env.NEXT_PUBLIC_TEMPLATE_ID = 'template';
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'site-key';

    setupFetch();
    (window as any).grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute: () => Promise.resolve(''),
    };
    processContactFormMock.mockResolvedValue({
      success: false,
      error: 'Captcha verification failed. Please try again.',
      code: 'invalid_recaptcha',
    });

    render(<Gedit />);

    await user.type(
      screen.getByPlaceholderText(
        /your email \(optionally name <email@example.com>\)/i
      ),
      'alex@example.com'
    );
    await user.type(screen.getByPlaceholderText(/subject \(optional\)/i), 'Status');
    await user.type(screen.getByPlaceholderText(/message/i), 'Fallback path');

    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(sendMock).toHaveBeenCalled());
    expect(sendMock).toHaveBeenCalledWith('service', 'template', {
      name: 'alex@example.com',
      email: 'alex@example.com',
      subject: 'Status',
      message: 'Fallback path',
      'g-recaptcha-response': '',
    });
    expect(
      await screen.findByText(/message sent via emailjs fallback/i)
    ).toBeInTheDocument();
    expect(eventMock).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'emailjs' })
    );
  });

  it('validates identity input before submitting', async () => {
    process.env.NEXT_PUBLIC_ENABLE_GEDIT_EMAILJS = 'false';
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'site-key';
    setupFetch();
    (window as any).grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute: () => Promise.resolve('rc-token'),
    };
    processContactFormMock.mockResolvedValue({ success: true });

    render(<Gedit />);

    await user.type(screen.getByPlaceholderText(/message/i), 'Test message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText(/contact information is required/i)).toBeInTheDocument();
    expect(processContactFormMock).not.toHaveBeenCalled();
  });
});
