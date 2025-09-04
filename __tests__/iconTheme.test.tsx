import { render, screen, waitFor } from '@testing-library/react';
import { IconPackProvider, useIconPack } from '@/hooks/useIconPack';
import { CloseIcon } from '@/components/ToolbarIcons';
import { useEffect } from 'react';

function ThemeSwitcher() {
  const { setTheme } = useIconPack();
  useEffect(() => {
    setTheme('flat-remix-blue');
  }, [setTheme]);
  return <CloseIcon />;
}

describe('IconPackProvider', () => {
  it('updates icon sources when theme changes', async () => {
    render(
      <IconPackProvider initialTheme="Yaru">
        <ThemeSwitcher />
      </IconPackProvider>
    );

    await waitFor(() => {
      const next = screen.getByAltText('Close') as HTMLImageElement;
      expect(next.getAttribute('src') || '').toContain('flat-remix-blue');
    });
  });
});
