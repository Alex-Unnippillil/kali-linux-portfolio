import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import Beef from '../components/apps/beef';

const enableLabMode = () => {
  fireEvent.click(screen.getByRole('checkbox', { name: /self-contained/i }));
  fireEvent.click(screen.getByRole('button', { name: /enable lab mode/i }));
};

describe('BeEF lab dashboard component', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('requires acknowledgement before lab mode unlocks controls', () => {
    render(<Beef />);

    expect(screen.getByText(/Lab mode is locked/i)).toBeInTheDocument();

    // Try enabling without acknowledgement
    fireEvent.click(screen.getByRole('button', { name: /enable lab mode/i }));
    expect(screen.getByText(/Lab mode is locked/i)).toBeInTheDocument();

    enableLabMode();

    expect(screen.getByRole('heading', { name: /Hooked clients/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Command composer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Module explorer/i })).toBeInTheDocument();
  });

  test('adds command entries to history with deterministic preview', () => {
    render(<Beef />);
    enableLabMode();

    fireEvent.change(screen.getByLabelText(/target hook/i), { target: { value: 'hook-3' } });
    fireEvent.change(screen.getByRole('combobox', { name: /module/i }), { target: { value: 'alert' } });
    fireEvent.change(screen.getByLabelText(/parameters/i), { target: { value: '{"message":"demo"}' } });
    fireEvent.click(screen.getByRole('button', { name: /run command/i }));

    expect(screen.getAllByText(/Alert displayed with static training copy/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/hook: helpdesk tablet/i)).toBeInTheDocument();
    expect(screen.getByText(/{"message":"demo"}/i)).toBeInTheDocument();
  });
});

