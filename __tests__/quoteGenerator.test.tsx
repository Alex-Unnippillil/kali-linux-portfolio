import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import QuoteGenerator from '../components/apps/quote_generator';

describe('QuoteGenerator', () => {
  const sequenceForSeed = async (seed: string) => {
    const { getByText, getByPlaceholderText, getByTestId, unmount } = render(
      <QuoteGenerator />
    );
    fireEvent.change(getByPlaceholderText('Seed'), { target: { value: seed } });
    await waitFor(() => {
      expect(getByTestId('quote-content').textContent).toBeTruthy();
    });
    const seq: (string | null)[] = [];
    for (let i = 0; i < 3; i++) {
      fireEvent.click(getByText('New Quote'));
      seq.push(getByTestId('quote-content').textContent);
    }
    unmount();
    return seq;
  };

  it('produces same sequence for same seed', async () => {
    const a = await sequenceForSeed('test-seed');
    const b = await sequenceForSeed('test-seed');
    expect(b).toEqual(a);
  });

  it('copies quote to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-ignore
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByText, getByPlaceholderText, getByTestId } = render(<QuoteGenerator />);
    fireEvent.change(getByPlaceholderText('Seed'), { target: { value: 'copy' } });
    await waitFor(() => {
      expect(getByTestId('quote-content').textContent).toBeTruthy();
    });
    const quote = getByTestId('quote-content').textContent || '';
    const author = getByTestId('quote-author').textContent || '';
    fireEvent.click(getByText('Copy'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`${quote} ${author}`.trim());
    });
  });
});

