import { act, fireEvent, render, screen } from '@testing-library/react';
import DelayedTooltip from '../../../components/ui/DelayedTooltip';

describe('DelayedTooltip accessibility', () => {
  it('shows the tooltip on focus and links it with aria-describedby', () => {
    render(
      <DelayedTooltip content="Tooltip text">
        {({ ref, onFocus, onBlur, onMouseEnter, onMouseLeave }) => (
          <button
            type="button"
            ref={ref}
            onFocus={onFocus}
            onBlur={onBlur}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            Trigger tooltip
          </button>
        )}
      </DelayedTooltip>,
    );

    const trigger = screen.getByRole('button', { name: /trigger tooltip/i });
    act(() => {
      trigger.focus();
      fireEvent.focus(trigger);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Tooltip text');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('removes the tooltip and aria-describedby attribute on blur', () => {
    render(
      <DelayedTooltip content="Tooltip text">
        {({ ref, onFocus, onBlur, onMouseEnter, onMouseLeave }) => (
          <button
            type="button"
            ref={ref}
            onFocus={onFocus}
            onBlur={onBlur}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            Trigger tooltip
          </button>
        )}
      </DelayedTooltip>,
    );

    const trigger = screen.getByRole('button', { name: /trigger tooltip/i });
    act(() => {
      trigger.focus();
      fireEvent.focus(trigger);
    });
    const tooltip = screen.getByRole('tooltip');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);

    act(() => {
      trigger.blur();
      fireEvent.blur(trigger);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('preserves any existing aria-describedby relationships', () => {
    render(
      <DelayedTooltip content="Tooltip text">
        {({ ref, onFocus, onBlur, onMouseEnter, onMouseLeave }) => (
          <button
            type="button"
            ref={ref}
            onFocus={onFocus}
            onBlur={onBlur}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            aria-describedby="existing-id"
          >
            Trigger tooltip
          </button>
        )}
      </DelayedTooltip>,
    );

    const trigger = screen.getByRole('button', { name: /trigger tooltip/i });

    act(() => {
      trigger.focus();
      fireEvent.focus(trigger);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toContain('existing-id');
    expect(trigger.getAttribute('aria-describedby')).toContain(tooltip.id);

    act(() => {
      trigger.blur();
      fireEvent.blur(trigger);
    });

    expect(trigger).toHaveAttribute('aria-describedby', 'existing-id');
  });
});
