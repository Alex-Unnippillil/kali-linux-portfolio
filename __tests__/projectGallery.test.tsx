import { render, screen, fireEvent } from '@testing-library/react';
import ProjectGallery from '../components/apps/project-gallery';
describe('ProjectGallery', () => {
  it('renders source-backed work and technology tags', () => {
    render(<ProjectGallery />); expect(screen.getByText('Kali Linux Portfolio')).toBeInTheDocument(); expect(screen.getAllByText('TypeScript').length).toBeGreaterThan(0);
  });
  it('separates forks from featured work', () => {
    render(<ProjectGallery />); fireEvent.click(screen.getByRole('button', { name: 'Featured' }));
    expect(screen.queryByText('GPT Researcher · fork')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open source' }));
    expect(screen.getByText('GPT Researcher · fork')).toBeInTheDocument(); expect(screen.queryByText('Kali Linux Portfolio')).not.toBeInTheDocument();
  });
  it('supports search and recovery from no matches', () => {
    render(<ProjectGallery />); fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'unmatched-string' } });
    expect(screen.getByText('No matching projects')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(screen.getByText('Web Crawler Studio')).toBeInTheDocument();
  });
  it('exposes architecture and actual source links', () => {
    render(<ProjectGallery />);
    const link = screen.getByRole('link', { name: 'Web Crawler Studio source on GitHub (opens a new tab)' });
    expect(link).toHaveAttribute('href', 'https://github.com/Alex-Unnippillil/web-crawler');
    expect(screen.getAllByText('Architecture & tradeoffs')).toHaveLength(5);
  });
});
