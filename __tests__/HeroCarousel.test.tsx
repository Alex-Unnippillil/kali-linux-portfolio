import { render, screen, fireEvent } from '@testing-library/react';
import HeroCarousel from '../components/HeroCarousel';

describe('HeroCarousel', () => {
  it('navigates slides with buttons and keyboard', () => {
    render(<HeroCarousel items={[<div key="a">A</div>, <div key="b">B</div>]} />);

    // Initial slide
    expect(screen.getByText('A')).toBeVisible();

    // Click next button
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(screen.getByText('B')).toBeVisible();

    const container = screen.getByLabelText('Hero carousel');
    // Keyboard navigation back
    fireEvent.keyDown(container, { key: 'ArrowLeft' });
    expect(screen.getByText('A')).toBeVisible();
  });

  it('responds to pointer swipe', () => {
    render(<HeroCarousel items={[<div key="a">A</div>, <div key="b">B</div>]} />);
    const container = screen.getByLabelText('Hero carousel');

    fireEvent.pointerDown(container, { clientX: 100 });
    fireEvent.pointerUp(container, { clientX: 0 });
    expect(screen.getByText('B')).toBeVisible();
  });
});
