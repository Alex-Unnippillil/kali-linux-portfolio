import { render, screen } from '@testing-library/react';
import DemoRunner from '../apps/ghidra/components/DemoRunner';

describe('Ghidra DemoRunner', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_GHIDRA_WASM;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('prompts for the WebAssembly bundle when no wasm URL is configured', async () => {
    render(<DemoRunner />);

    expect(
      await screen.findByText(/hosted Ghidra WebAssembly bundle to be exposed through NEXT_PUBLIC_GHIDRA_WASM/i)
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /retry setup/i })).toBeInTheDocument();
  });
});
