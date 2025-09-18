import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AutofillModal from '../../../components/ui/AutofillModal';
import {
  __resetPassClient,
  listItems,
  requestAutofill,
} from '../../../utils/passClient';

describe('AutofillModal', () => {
  beforeEach(() => {
    __resetPassClient();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    __resetPassClient();
  });

  it('allows approving an autofill request', async () => {
    render(<AutofillModal />);
    const credentials = listItems();
    const firstLabel = credentials[0].label;
    const expectedValue = credentials[0].fields.password;
    const onFill = jest.fn();

    let resultPromise!: Promise<boolean>;
    await act(async () => {
      resultPromise = requestAutofill({
        targetAppId: 'browser',
        targetField: 'login.password',
        targetLabel: 'Login password',
        secretField: 'password',
        onFill,
      });
    });

    expect(await screen.findByRole('heading', { name: /autofill request/i })).toBeInTheDocument();

    const option = await screen.findByRole('radio', {
      name: new RegExp(firstLabel, 'i'),
    });
    fireEvent.click(option);
    await waitFor(() => expect(option).toBeChecked());
    fireEvent.click(screen.getByRole('button', { name: /fill/i }));

    await waitFor(() => expect(onFill).toHaveBeenCalledWith(expectedValue));
    await expect(resultPromise).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('can cancel an autofill request', async () => {
    render(<AutofillModal />);

    let resultPromise!: Promise<boolean>;
    await act(async () => {
      resultPromise = requestAutofill({
        targetAppId: 'browser',
        targetField: 'login.username',
        targetLabel: 'Login username',
        secretField: 'username',
        onFill: jest.fn(),
      });
    });

    expect(await screen.findByRole('heading', { name: /autofill request/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await expect(resultPromise).resolves.toBe(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

