# EmptyState component

`components/system/EmptyState.tsx` provides a shared presentation for "no data" or "set up" states across the desktop simulators.
It inherits color tokens from the active theme, so it adapts automatically to Kali, dark, and alternate palettes.

## Usage

```tsx
import EmptyState from '../components/system/EmptyState';

export function Example() {
  return (
    <EmptyState
      title="Nothing here yet"
      helperText="Start by creating a record or importing demo data."
      icon={
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      }
      iconLabel="Empty clipboard"
      action={
        <button
          type="button"
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-inverse)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        >
          Create item
        </button>
      }
    />
  );
}
```

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `icon` | `React.ReactNode` | Decorative glyph rendered in a rounded container above the title. Provide `iconLabel` when it conveys meaning. |
| `iconLabel` | `string` | Accessible label read by screen readers. When omitted the icon is treated as decorative. |
| `title` | `React.ReactNode` | Primary heading for the state. |
| `helperText` | `React.ReactNode` | Supporting copy. Inline elements (links, emphasis) are supported. |
| `action` | `React.ReactNode` | Button, link, or control rendered below the message. |
| `className` | `string` | Optional classes appended to the root for layout overrides. |
| `children` | `React.ReactNode` | Additional custom content placed between the title and helper text. |

## Guidelines

- **Use meaningful helper copy.** Clarify why the view is empty and what to do next. When actionable options exist, surface them through the `action` slot.
- **Keep icons decorative.** Provide an `iconLabel` only when the glyph communicates essential information. Otherwise allow the component to mark it `aria-hidden` automatically.
- **Respect theme contrast.** The component relies on CSS variables (`--color-surface`, `--color-border`, `--color-accent`) so text remains legible in every theme mode.
- **Keep layout responsive.** The base component caps width at `max-w-xl`; supply a narrower `className` (e.g., `max-w-sm`) for tight sidebars or cards.
- **Pair with primary actions.** Follow the button styling snippet above to match existing accent buttons when supplying `action` elements.

## References

- Adopted on the Todoist simulator columns, Metasploit Post-Exploitation catalog, and Gamepad Calibration utility to remove bespoke empty layouts.
- Reuse this component for other dashboards or utilities that present "no data", onboarding, or loading fallback states.
