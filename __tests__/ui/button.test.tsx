import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../../components/ui/Button';

describe('Button', () => {
  it('applies variant styles', () => {
    const { rerender } = render(<Button>Primary</Button>);
    const button = screen.getByRole('button', { name: 'Primary' });
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).toHaveClass('bg-kali-primary');

    rerender(
      <Button variant="ghost">
        Ghost
      </Button>,
    );
    const ghost = screen.getByRole('button', { name: 'Ghost' });
    expect(ghost).toHaveAttribute('data-variant', 'ghost');
    expect(ghost).toHaveClass('hover:bg-kali-primary/10');
  });

  it('disables interaction while loading', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(
      <Button loading onClick={handleClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('.animate-spin')).toBeTruthy();

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('respects disabled prop independently from loading', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
