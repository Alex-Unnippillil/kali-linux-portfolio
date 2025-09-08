import { render } from '@testing-library/react';
import { Icon } from '../components/ui/Icon';

describe('Icon', () => {
  it.each([
    [1, 24],
    [2, 48],
    [3, 72],
  ])('renders correct size at %ix DPR', (scale, expected) => {
    const { container } = render(<Icon name="close" scale={scale} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', String(expected));
    expect(svg).toHaveAttribute('height', String(expected));
    expect(svg).toHaveAttribute('stroke-width', '2');
  });

  it('supports 20px icons with adjusted stroke width', () => {
    const { container } = render(<Icon name="close" size={20} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
    expect(svg).toHaveAttribute('stroke-width', '1.5');
    expect(svg?.getAttribute('class')).toContain('w-5');
  });
});
