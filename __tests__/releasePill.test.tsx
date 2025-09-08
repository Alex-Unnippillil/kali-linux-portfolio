import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from '../components/layout/Header';
import posts from '../data/kali-blog.json';

describe('release pill', () => {
  const latest = (posts as any[]).find((p) => p.link.includes('release'))!;

  beforeEach(() => {
    sessionStorage.clear();
  });

  test('shows latest release link and allows dismissal', async () => {
    render(<Header />);
    const link = await screen.findByRole('link', { name: /new release/i });
    expect(link).toHaveAttribute('href', latest.link);
    expect(link.textContent).toContain(latest.title);
    const button = screen.getByRole('button', {
      name: /dismiss release notification/i,
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /new release/i })).toBeNull(),
    );
    expect(sessionStorage.getItem('dismissed-release')).toBe(latest.date);
  });

  test('pill is hidden after dismissal for session', () => {
    sessionStorage.setItem('dismissed-release', latest.date);
    render(<Header />);
    expect(screen.queryByRole('link', { name: new RegExp(latest.title, 'i') })).toBeNull();
  });
});
