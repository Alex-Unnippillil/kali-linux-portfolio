import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuoteApp from '../apps/quote';
import copyToClipboard from '../utils/clipboard';

jest.mock('../utils/clipboard', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

const mockedCopyToClipboard = copyToClipboard as jest.MockedFunction<typeof copyToClipboard>;

describe('Quote app quick actions', () => {
  const originalOpen = window.open;

  afterEach(() => {
    window.open = originalOpen;
    jest.clearAllMocks();
  });

  it('shows a success message after copying the quote', async () => {
    const user = userEvent.setup();
    render(<QuoteApp />);

    const copyButton = await screen.findByRole('button', { name: /copy quote/i });
    await user.click(copyButton);

    expect(mockedCopyToClipboard).toHaveBeenCalled();
    expect(await screen.findByText(/quote copied to clipboard/i)).toBeInTheDocument();
  });

  it('shows a success message after opening the tweet composer', async () => {
    const user = userEvent.setup();
    const openSpy = jest.fn().mockReturnValue({});
    window.open = openSpy as typeof window.open;

    render(<QuoteApp />);

    const tweetButton = await screen.findByRole('button', { name: /tweet quote/i });
    await user.click(tweetButton);

    expect(openSpy).toHaveBeenCalled();
    expect(await screen.findByText(/tweet composer opened in a new tab/i)).toBeInTheDocument();
  });
});

