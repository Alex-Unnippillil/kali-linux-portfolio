import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import PasswordGenerator from '../apps/password_generator';
import { jsx as _jsx } from "react/jsx-runtime";
describe('PasswordGenerator', () => {
  it('generates password of specified length', () => {
    const {
      getByText,
      getByLabelText,
      getByTestId
    } = render(/*#__PURE__*/_jsx(PasswordGenerator, {}));
    fireEvent.change(getByLabelText(/Length/i), {
      target: {
        value: '8'
      }
    });
    fireEvent.click(getByText('Generate'));
    const value = getByTestId('password-display').value;
    expect(value).toHaveLength(8);
  });
  it('copies password to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText
      }
    });
    const {
      getByText,
      getByTestId
    } = render(/*#__PURE__*/_jsx(PasswordGenerator, {}));
    fireEvent.click(getByText('Generate'));
    const value = getByTestId('password-display').value;
    fireEvent.click(getByText('Copy'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(value);
    });
  });
});
