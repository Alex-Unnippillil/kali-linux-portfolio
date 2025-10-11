import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MimikatzApp from '../components/apps/mimikatz';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: jest.fn(),
    },
  });
  Object.defineProperty(global.URL, 'createObjectURL', {
    configurable: true,
    value: jest.fn(() => 'blob:fixture'),
  });
  Object.defineProperty(global.URL, 'revokeObjectURL', {
    configurable: true,
    value: jest.fn(),
  });
});

describe('MimikatzApp UI', () => {
  it('reveals credential fixtures with context when Lab Mode is enabled', async () => {
    const user = userEvent.setup();
    render(<MimikatzApp />);

    const enableButton = await screen.findByRole('button', { name: /enable/i });
    await user.click(enableButton);

    expect(await screen.findByText('ACME\\Administrator')).toBeInTheDocument();
    expect(
      screen.getByText(/blank-password sentinel/i)
    ).toBeInTheDocument();
  });

  it('composes safe command strings without executing them', async () => {
    const user = userEvent.setup();
    render(<MimikatzApp />);

    const enableButton = await screen.findByRole('button', { name: /enable/i });
    await user.click(enableButton);

    const builders = await screen.findAllByLabelText(/command builder/i);
    const firstBuilder = builders[0];
    const targetInput = within(firstBuilder).getByLabelText(/target/i);
    const output = within(firstBuilder).getByLabelText(/command output/i);

    expect(output.textContent).toMatch(/sekurlsa::logonpasswords/);
    await user.clear(targetInput);
    await user.type(targetInput, 'demo-lsass.dmp');
    expect(output.textContent).toMatch(/demo-lsass\.dmp/);
  });

  it('surfaces blue team mitigation guidance from fixtures', async () => {
    const user = userEvent.setup();
    render(<MimikatzApp />);

    const enableButton = await screen.findByRole('button', { name: /enable/i });
    await user.click(enableButton);

    const stepButton = await screen.findByRole('button', {
      name: /Step 1: Invoke Mimikatz/i,
    });
    await user.click(stepButton);

    expect(
      screen.getByText(/Restrict execution through application control/i)
    ).toBeInTheDocument();
  });
});
