import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DummyForm from '../pages/dummy-form';

describe('DummyForm', () => {
  it('shows field validation on blur with aria metadata', async () => {
    const user = userEvent.setup();
    render(<DummyForm />);

    const nameInput = screen.getByLabelText(/Name/i);
    await user.click(nameInput);
    await user.tab();

    const errorMessage = await screen.findByText('Name is required');
    expect(errorMessage).toHaveAttribute('id', 'name-error');
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
  });

  it('displays an error summary on submit and focuses it', async () => {
    const user = userEvent.setup();
    render(<DummyForm />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    const summary = await screen.findByTestId('error-summary');
    await waitFor(() => expect(summary).toHaveFocus());

    const links = within(summary).getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '#name');
    expect(links[1]).toHaveAttribute('href', '#email');
    expect(links[2]).toHaveAttribute('href', '#message');

    expect(screen.getByLabelText(/Email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Message/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits successfully when all fields are valid', async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock;
    const originalFlag = process.env.NEXT_PUBLIC_STATIC_EXPORT;
    delete process.env.NEXT_PUBLIC_STATIC_EXPORT;

    try {
      render(<DummyForm />);

      await user.type(screen.getByLabelText(/Name/i), 'Alex Example');
      await user.type(screen.getByLabelText(/Email/i), 'alex@example.com');
      await user.type(screen.getByLabelText(/Message/i), 'Hello from tests.');

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/dummy',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      const payload = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(payload).toEqual({
        name: 'Alex Example',
        email: 'alex@example.com',
        message: 'Hello from tests.',
      });

      expect(await screen.findByText('Form submitted successfully!')).toBeInTheDocument();
      expect(screen.queryByTestId('error-summary')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Email/i)).toHaveValue('');
      expect(screen.getByLabelText(/Message/i)).toHaveValue('');
    } finally {
      if (originalFetch) {
        (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
      } else {
        delete (global as unknown as { fetch?: typeof fetch }).fetch;
      }
      if (originalFlag !== undefined) {
        process.env.NEXT_PUBLIC_STATIC_EXPORT = originalFlag;
      }
    }
  });
});
