import { render, screen } from '@testing-library/react';
import Header from '../components/kali/Header';
import Footer from '../components/kali/Footer';
import ia from '../data/ia.json';

describe('IA navigation', () => {
  test('header renders items from ia.json', () => {
    render(<Header />);
    (ia as any).header.forEach((item: any) => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    });
  });

  test('footer renders groups and social links from ia.json', () => {
    render(<Footer />);
    (ia as any).footer.groups.forEach((group: any) => {
      expect(screen.getByText(group.label)).toBeInTheDocument();
      group.items.forEach((it: any) => {
        expect(screen.getByText(it.label)).toBeInTheDocument();
      });
    });
    (ia as any).footer.social.forEach((s: any) => {
      expect(screen.getByText(s.label)).toBeInTheDocument();
    });
  });

  test('header status pill links to system status page', async () => {
    const href = (ia as any).footer.groups
      .flatMap((g: any) => g.items)
      .find((i: any) => i.label === 'System Status').href;
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ status: 'operational' }) });
    render(<Header />);
    const link = await screen.findByLabelText(/system status/i);
    expect(link).toHaveAttribute('href', href);
  });
});
