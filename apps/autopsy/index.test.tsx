import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AutopsyPage from './index';

describe('Autopsy app tabbed navigation', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('cycles focus and selection with arrow keys', () => {
    render(<AutopsyPage />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    tabs[0].focus();
    expect(tabs[0]).toHaveFocus();

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('restores and persists selection via the location hash', async () => {
    window.location.hash = '#view=keywords';

    render(<AutopsyPage />);

    const keywordTab = await screen.findByRole('tab', { name: /Keyword Tester/i });
    await waitFor(() =>
      expect(keywordTab).toHaveAttribute('aria-selected', 'true'),
    );

    const autopsyTab = screen.getByRole('tab', { name: /^Autopsy/ });
    fireEvent.click(autopsyTab);

    await waitFor(() =>
      expect(window.location.hash).toContain('view=autopsy'),
    );
  });
});
