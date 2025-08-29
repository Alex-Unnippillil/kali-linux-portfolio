import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TargetEmulator from './TargetEmulator';
import modules from '../../../components/apps/metasploit/modules.json';

describe('TargetEmulator', () => {
  it('shows deterministic output and resets', () => {
    render(<TargetEmulator />);
    const select = screen.getByLabelText(/select module/i);
    fireEvent.change(select, { target: { value: modules[0].name } });
    const first = screen.getByTestId('session-output').textContent;
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('session-output').textContent).toMatch(/Select a module/);
    fireEvent.change(select, { target: { value: modules[0].name } });
    const second = screen.getByTestId('session-output').textContent;
    expect(first).toBe(second);
  });
});
