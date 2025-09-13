import { render, screen } from '@testing-library/react';
import NewsStrip from '../components/landing/NewsStrip';

describe('NewsStrip', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve([
          {
            title: 'Example news item that is fairly long to test truncation',
            url: 'https://example.com',
          },
        ]),
    }) as any;
  });

  test('renders links that open in a new tab', async () => {
    render(<NewsStrip />);
    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
