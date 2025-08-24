import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import BadgeList from '@components/BadgeList';

describe('BadgeList accessibility', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'en',
    });
  });

  it('opens modal with keyboard and closes with Escape', () => {
    const badges = [
      {
        label: 'React',
        src: '/react.png',
        alt: 'React',
        description: 'UI library',
      },
    ];
    render(<BadgeList badges={badges} />);
    const badgeButton = screen.getByRole('button', {
      name: /view details for react/i,
    });
    badgeButton.focus();
    fireEvent.keyDown(badgeButton, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

