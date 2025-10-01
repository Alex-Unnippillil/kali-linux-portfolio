import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import useFormFSM from '../hooks/useFormFSM';

describe('useFormFSM hook', () => {
  const TestComponent: React.FC<{
    onSubmit: jest.Mock;
    onSuccess: jest.Mock;
  }> = ({ onSubmit, onSuccess }) => {
    const form = useFormFSM();

    form.useSubmitEffect((current) => {
      onSubmit(current);
      form.resolve({ ok: true });
    }, [onSubmit]);

    form.useSuccessEffect((current) => {
      onSuccess(current);
    }, [onSuccess]);

    return (
      <div>
        <button type="button" onClick={() => form.change()}>
          change
        </button>
        <button
          type="button"
          onClick={() => {
            form.validate();
            form.submit({ message: 'hello' });
          }}
        >
          submit
        </button>
        <button
          type="button"
          onClick={() => {
            form.submit({});
          }}
        >
          submit-invalid
        </button>
        <span data-testid="status">{form.status}</span>
      </div>
    );
  };

  it('invokes submit and success effects in order', () => {
    const onSubmit = jest.fn();
    const onSuccess = jest.fn();
    render(<TestComponent onSubmit={onSubmit} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByText('change'));
    fireEvent.click(screen.getByText('submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].status).toBe('Running');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0][0].status).toBe('Done');
  });

  it('prevents submission before validation', () => {
    const onSubmit = jest.fn();
    const onSuccess = jest.fn();
    render(<TestComponent onSubmit={onSubmit} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByText('change'));
    fireEvent.click(screen.getByText('submit-invalid'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('Dirty');
  });
});
