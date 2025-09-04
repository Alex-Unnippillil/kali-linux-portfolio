# Toast Utility

A global toast system is available in `components/ui/Toast.tsx`.

## Usage

Wrap your app with the `ToastProvider` (already done in `_app.jsx`). Then use one of the hooks:

- `useSuccessToast()` – show a success message.
- `useErrorToast()` – show an error message.
- `useLongTaskToast()` – show a persistent message for long-running tasks; returns a function to dismiss the toast.

```tsx
import { useSuccessToast, useLongTaskToast } from '../components/ui/Toast';

const Example = () => {
  const success = useSuccessToast();
  const longTask = useLongTaskToast();

  const handleSave = () => {
    const dismiss = longTask('Saving...');
    // perform async work then dismiss
    setTimeout(() => {
      dismiss();
      success('Saved');
    }, 1000);
  };

  return <button onClick={handleSave}>Save</button>;
};
```

All toasts share consistent styling and default to a 6&nbsp;second duration.
