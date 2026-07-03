import { render, screen, fireEvent } from '@testing-library/react';
import PreQualForm from '../pages/prequal-form';

describe('pre-qualification form', () => {
  it('prompts booking when answers show strong fit', () => {
    render(<PreQualForm />);
    fireEvent.change(screen.getByLabelText(/project goal/i), {
      target: { value: 'pentest' },
    });
    fireEvent.change(screen.getByLabelText(/timeline to start/i), {
      target: { value: 'now' },
    });
    fireEvent.change(screen.getByLabelText(/approved budget/i), {
      target: { value: 'yes' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/schedule a call/i)).toBeInTheDocument();
  });

  it('suggests resources when not a fit', () => {
    render(<PreQualForm />);
    fireEvent.change(screen.getByLabelText(/project goal/i), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText(/timeline to start/i), {
      target: { value: 'later' },
    });
    fireEvent.change(screen.getByLabelText(/approved budget/i), {
      target: { value: 'no' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(
      screen.getByText(/before booking, you may find these resources helpful/i)
    ).toBeInTheDocument();
  });
});
