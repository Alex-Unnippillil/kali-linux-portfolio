import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Breadcrumbs from '../../components/ui/Breadcrumbs';

describe('Breadcrumbs', () => {
  it('applies truncation and tooltip for long labels', () => {
    const handleNavigate = jest.fn();
    const longLabel = 'this-is-a-very-long-directory-name-that-should-truncate';

    render(
      <Breadcrumbs
        path={[
          { name: 'root' },
          { name: longLabel },
        ]}
        onNavigate={handleNavigate}
      />
    );

    const buttons = screen.getAllByRole('button');
    const lastButton = buttons[buttons.length - 1];

    expect(lastButton).toHaveAttribute('title', longLabel);
    const textSpan = lastButton.querySelector('span');
    expect(textSpan).not.toBeNull();
    expect(textSpan as HTMLElement).toHaveClass('truncate');
  });

  it('supports arrow-key focus navigation', async () => {
    const handleNavigate = jest.fn();
    const user = userEvent.setup();

    render(
      <Breadcrumbs
        path={[{ name: 'root' }, { name: 'home' }, { name: 'projects' }]}
        onNavigate={handleNavigate}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons[0].focus();

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[1]);

    await user.keyboard('{End}');
    expect(document.activeElement).toBe(buttons[2]);

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(buttons[0]);
  });
});
