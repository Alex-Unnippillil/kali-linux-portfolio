import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModuleWorkspace from '../pages/module-workspace';
import { getValue, clearStore } from '../utils/moduleStore';
import { NetworkProfileProvider } from '../hooks/useNetworkProfile';

describe('ModuleWorkspace key-value store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => clearStore());

  it('saves module output to the store', () => {
    render(
      <NetworkProfileProvider>
        <ModuleWorkspace />
      </NetworkProfileProvider>,
    );

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
});
