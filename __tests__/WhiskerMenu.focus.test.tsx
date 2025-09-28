import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />,
}));

describe('WhiskerMenu focus management', () => {
  const renderMenu = () => {
    const onActiveItemChange = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <WhiskerMenu
        onActiveItemChange={onActiveItemChange}
        onOpenChange={onOpenChange}
        announcementId="test-announcement"
      />,
    );
    return { onActiveItemChange, onOpenChange };
  };

  it('moves focus to the category list when navigating left from the search input', () => {
    renderMenu();
    const toggle = screen.getByRole('button', { name: /applications/i });
    fireEvent.click(toggle);
    const search = screen.getByRole('textbox', { name: /search applications/i });
    search.focus();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    const selectedOption = screen.getByRole('option', { selected: true });
    expect(selectedOption).toHaveFocus();
  });

  it('returns focus to the search input when navigating right from the category list', () => {
    renderMenu();
    const toggle = screen.getByRole('button', { name: /applications/i });
    fireEvent.click(toggle);
    const search = screen.getByRole('textbox', { name: /search applications/i });
    search.focus();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    const selectedOption = screen.getByRole('option', { selected: true });

    fireEvent.keyDown(selectedOption, { key: 'ArrowRight' });

    expect(search).toHaveFocus();
  });

  it('closes the menu and restores focus to the toggle button when Escape is pressed', async () => {
    renderMenu();
    const toggle = screen.getByRole('button', { name: /applications/i });
    fireEvent.click(toggle);
    const search = screen.getByRole('textbox', { name: /search applications/i });
    search.focus();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(toggle).toHaveFocus());
  });
});
