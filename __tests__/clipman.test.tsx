import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Clipman from '../components/Clipman';
import { pastePlainText } from '@/src/lib/clipboard';

jest.mock('@/src/lib/clipboard', () => ({
  pastePlainText: jest.fn().mockResolvedValue('hello'),
}));

describe('Clipman context menu', () => {
  it('pastes plain text into input', async () => {
    const { getByPlaceholderText, getByText } = render(<Clipman />);
    const input = getByPlaceholderText('Sample input') as HTMLInputElement;
    fireEvent.contextMenu(input);
    fireEvent.click(getByText('Paste Plain Text'));
    await waitFor(() => expect(input).toHaveValue('hello'));
    expect(pastePlainText).toHaveBeenCalled();
  });
});
