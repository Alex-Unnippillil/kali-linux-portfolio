import { render, screen } from '@testing-library/react';
import Footer from '../components/common/Footer';

describe('Footer', () => {
  test('renders social links with correct destinations', () => {
    render(<Footer />);
    const links: [string, string][] = [
      ['Bluesky', 'https://bsky.app/profile/kalilinux.bsky.social'],
      ['Facebook', 'https://www.facebook.com/KaliLinux'],
      ['Instagram', 'https://www.instagram.com/kalilinux/'],
      ['Mastodon', 'https://infosec.exchange/@kalilinux'],
      ['Substack', 'https://kalilinux.substack.com/'],
      ['X', 'https://x.com/kalilinux'],
      ['Newsletter', 'https://www.kali.org/newsletter/'],
      ['RSS', 'https://www.kali.org/rss.xml'],
    ];

    for (const [name, href] of links) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
    }
  });
});
