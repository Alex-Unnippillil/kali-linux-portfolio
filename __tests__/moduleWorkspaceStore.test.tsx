import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModuleWorkspace from '../pages/module-workspace';
import { getValue, clearStore } from '../utils/moduleStore';

describe('ModuleWorkspace key-value store', () => {
  afterEach(() => clearStore());

  it('saves module output to the store', () => {
    render(<ModuleWorkspace />);

    fireEvent.change(screen.getByPlaceholderText('New workspace'), {
      target: { value: 'ws1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    fireEvent.click(screen.getByRole('button', { name: /Port Scanner/i }));
    fireEvent.change(screen.getByLabelText(/TARGET/), {
      target: { value: 'host' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));

    const stored = getValue('port-scan');
    expect(stored).toBeDefined();
    expect(stored).toContain('port-scan TARGET=host');
  });

  it('persists window gap per workspace', () => {
    render(<ModuleWorkspace />);

    fireEvent.change(screen.getByPlaceholderText('New workspace'), {
      target: { value: 'ws1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    fireEvent.change(screen.getByLabelText('Window gap'), {
      target: { value: '10' },
    });

    fireEvent.change(screen.getByPlaceholderText('New workspace'), {
      target: { value: 'ws2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    fireEvent.change(screen.getByLabelText('Window gap'), {
      target: { value: '20' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'ws1' }));

    expect(screen.getByLabelText('Window gap')).toHaveValue('10');
    expect(
      document.documentElement.style.getPropertyValue('--win-gap'),
    ).toBe('10px');
  });
});
