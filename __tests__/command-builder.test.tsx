import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommandBuilder from '../components/CommandBuilder';

describe('CommandBuilder validation', () => {
  const build = ({ target = '', opts = '' }) => `curl ${opts} ${target}`.trim();
  const fields = [
    {
      key: 'target',
      label: 'Target URL or Host',
      required: true,
      placeholder: 'https://example.com',
      example: 'https://demo.target',
    },
    {
      key: 'opts',
      label: 'Curl Flags',
      required: false,
      placeholder: '-I --user-agent "Demo"',
      example: '-I --user-agent "Demo"',
    },
  ];

  it('prevents submission and focuses the first missing required field', async () => {
    const user = userEvent.setup();
    render(<CommandBuilder doc="demo" build={build} fields={fields} />);

    const submitButton = screen.getByRole('button', { name: /build command/i });
    await user.click(submitButton);

    const targetInput = screen.getByLabelText(/target url or host/i);
    expect(targetInput).toHaveFocus();
    expect(targetInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('allows submission when required fields are filled and optional fields stay blank', async () => {
    const user = userEvent.setup();
    render(<CommandBuilder doc="demo" build={build} fields={fields} />);

    const targetInput = screen.getByLabelText(/target url or host/i);
    await user.type(targetInput, 'https://example.com');

    const submitButton = screen.getByRole('button', { name: /build command/i });
    await user.click(submitButton);

    expect(targetInput).toHaveAttribute('aria-invalid', 'false');

    const optionalField = screen.getByLabelText(/curl flags/i);
    expect(optionalField).toHaveAttribute('aria-invalid', 'false');
  });
});
