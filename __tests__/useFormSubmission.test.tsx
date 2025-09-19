import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import useFormSubmission from '../hooks/useFormSubmission';

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

const createDeferred = (): Deferred => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const TestForm: React.FC<{ onSubmit: () => Promise<void> }> = ({ onSubmit }) => {
  const { pending, handleSubmit, submitProps } = useFormSubmission<React.FormEvent<HTMLFormElement>>({
    onSubmit: async (event) => {
      event.preventDefault();
      await onSubmit();
    },
  });

  return (
    <form onSubmit={handleSubmit} data-testid="form">
      <button type="submit" {...submitProps}>
        {pending ? 'Pending' : 'Submit'}
      </button>
    </form>
  );
};

describe('useFormSubmission', () => {
  it('ignores duplicate submits while pending and re-enables afterward', async () => {
    const first = createDeferred();
    const second = createDeferred();
    const submit = jest
      .fn<Promise<void>, []>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    render(<TestForm onSubmit={submit} />);

    const form = screen.getByTestId('form');
    const button = screen.getByRole('button');

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(submit).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    first.resolve();
    await waitFor(() => expect(button).not.toBeDisabled());

    fireEvent.submit(form);
    expect(submit).toHaveBeenCalledTimes(2);

    second.resolve();
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
