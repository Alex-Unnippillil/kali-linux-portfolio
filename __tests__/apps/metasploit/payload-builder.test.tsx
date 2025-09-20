import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PayloadBuilderForm from '../../../apps/metasploit/components/PayloadBuilderForm';

describe('PayloadBuilderForm', () => {
  const writeText = jest.fn<Promise<void>, [string]>();

  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
  });

  it('updates dependent fields and preview when payload type changes', () => {
    render(<PayloadBuilderForm />);

    fireEvent.change(screen.getByLabelText(/Payload Type/i), {
      target: { value: 'linux/x64/meterpreter_reverse_tcp' },
    });

    expect(screen.getByLabelText(/Architecture/i)).toHaveValue('x64');

    const hostInput = screen.getByLabelText('LHOST');
    fireEvent.change(hostInput, { target: { value: '10.10.14.5' } });

    const preview = screen.getByTestId('payload-preview');
    expect(preview.textContent).toContain('"payload": "linux/x64/meterpreter_reverse_tcp"');
    expect(preview.textContent).toContain('"LHOST": "10.10.14.5"');
  });

  it('shows validation errors and disables submit for invalid configuration', async () => {
    render(<PayloadBuilderForm />);

    const hostInput = screen.getByLabelText('LHOST');
    const submitButton = screen.getByRole('button', { name: /Generate Payload/i });

    fireEvent.change(hostInput, { target: { value: '192.168.56.1' } });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.change(hostInput, { target: { value: '' } });

    expect(await screen.findByText('LHOST is required.')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('copies payload script to clipboard when configuration is valid', async () => {
    render(<PayloadBuilderForm />);

    const hostInput = screen.getByLabelText('LHOST');
    const submitButton = screen.getByRole('button', { name: /Generate Payload/i });

    fireEvent.change(hostInput, { target: { value: '192.168.56.1' } });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.submit(screen.getByTestId('payload-builder-form'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const payloadScript = writeText.mock.calls[0][0];
    expect(payloadScript).toContain('use payload/windows/meterpreter_reverse_tcp');
    expect(payloadScript).toContain('set LHOST 192.168.56.1');
    expect(payloadScript).toContain('generate -f raw');
    expect(screen.getByText(/Payload copied to clipboard/i)).toBeInTheDocument();
  });
});
