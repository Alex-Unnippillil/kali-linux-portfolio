import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FilterEditor from '../../../modules/ettercap/components/FilterEditor';

jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Ettercap filter editor', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows validation errors with line numbers', () => {
    render(<FilterEditor />);

    const textarea = screen.getByLabelText(/filter source/i);
    fireEvent.change(textarea, { target: { value: 'drop\nunknown command' } });

    expect(screen.getByText(/Validation errors/i)).toBeInTheDocument();
    expect(screen.getByText(/Line 1: drop requires a pattern string/i)).toBeInTheDocument();
    expect(screen.getByText(/Line 2: Unknown command/i)).toBeInTheDocument();
  });

  it('creates new samples without window prompts', () => {
    render(<FilterEditor />);

    const nameInput = screen.getByPlaceholderText(/enter sample name/i);
    fireEvent.change(nameInput, { target: { value: 'Drop HTTP' } });

    fireEvent.click(screen.getByRole('button', { name: /create sample/i }));

    expect(screen.getByRole('option', { name: /drop http/i })).toBeInTheDocument();
  });
});
