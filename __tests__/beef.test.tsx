import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
jest.mock('../components/apps/beef/HookStepper', () => () => <div data-testid="stepper" />);
import Beef from '../components/apps/beef';

beforeEach(() => {
  window.localStorage.setItem('beefHelpDismissed', 'true');
  (global.fetch as jest.Mock) = jest.fn((url: string) => {
    if (url.endsWith('hooks.json')) {
      return Promise.resolve({ json: () => Promise.resolve({ hooked_browsers: [{ id: '1', name: 'One', status: 'online' }] }) });
    }
    if (url.endsWith('modules.json')) {
      return Promise.resolve({ json: () => Promise.resolve({ modules: [{ id: 'mod1', name: 'Module 1', output: 'result' }] }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  }) as any;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('BeEF app', () => {
  it('runs a module and displays output', async () => {
    render(<Beef />);
    fireEvent.click(await screen.findByText('One'));
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'mod1' } });
    fireEvent.click(screen.getByText('Run Module'));
    expect(await screen.findByText('result')).toBeInTheDocument();
  });

  it('shows sandboxed iframe when demo URL is set', async () => {
    process.env.NEXT_PUBLIC_BEEF_URL = 'https://example.com';
    render(<Beef />);
    const iframe = await screen.findByTitle('BeEF demo');
    expect(iframe).toHaveAttribute('src', 'https://example.com');
    expect(iframe).toHaveAttribute('sandbox');
    delete process.env.NEXT_PUBLIC_BEEF_URL;
  });
});
