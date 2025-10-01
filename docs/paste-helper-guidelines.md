# Paste Helper Usage Guidelines

The `PasteHelper` component provides a consistent, defensive clipboard experience across forms, editors, and simulated tools. Use it whenever a user can paste multi-line or structured content.

## When to wrap a control

- Wrap `<textarea>`, `<input type="text">`, code editors, and `contentEditable` regions that accept user-provided snippets.
- Prefer `PasteHelper` for import dialogs (JSON, CSV) and any place the UI previously allowed raw HTML pastes.
- Skip wrapping simple single-character inputs or fields that already provide their own paste interception.

## Basic usage

```tsx
import PasteHelper from '@/components/common/PasteHelper';

export default function ExampleForm() {
  const [value, setValue] = useState('');

  return (
    <PasteHelper onPaste={(result) => setValue(result.text)}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full h-40 bg-ub-dark border border-ubt-grey p-3"
        placeholder="Paste JSON, CSV, or code"
      />
    </PasteHelper>
  );
}
```

`PasteHelper` clones the child element and injects a controlled paste handler. When the user pastes, a contextual “Paste as…” chooser appears near the focused control. Selecting a format inserts normalized text and fires the optional `onPaste` callback.

## Sanitization and normalization

- HTML payloads are sanitized with DOMPurify before any markup is reinserted into content-editable regions.
- Line endings are normalized to `\n`, ensuring consistent downstream parsing and diffing.
- JSON payloads are parsed and pretty-printed when “Paste as JSON” is chosen.

## Accessibility considerations

- The chooser traps focus only momentarily; users can dismiss it with `Esc` or by clicking outside.
- All actions are reachable via keyboard: `Tab` through the options and press `Enter` to select.

## Testing checklist

- Add a unit test when you extend detection logic (e.g., new formats) or alter sanitization rules.
- Ensure Jest coverage includes both HTML sanitization and newline normalization scenarios.
- Verify that choosing each format produces the expected output in your component’s state or editor.
