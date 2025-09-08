import { render, screen } from '@testing-library/react';
import Header from '../components/kali/Header';
import Footer from '../components/kali/Footer';
import ia from '../data/ia.json';

describe('IA navigation', () => {
  test('header renders items from ia.json', () => {
    render(<Header />);
    (ia as any).header.forEach((item: any) => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
      if (item.children) {
        item.children.forEach((child: any) => {
          expect(screen.getByText(child.label)).toBeInTheDocument();
        });
      }
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
});
