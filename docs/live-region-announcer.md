# Live region announcer hook

The global app shell wires an `aria-live` region so copy/cut/paste feedback and Notification API messages are spoken by assistive technology. The logic now lives in `useLiveRegionAnnouncer` so feature apps can opt in without rewriting the listeners.

## Usage

```tsx
import { useRef } from 'react';
import useLiveRegionAnnouncer from '../../hooks/useLiveRegionAnnouncer';

export default function Example() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const announcer = useLiveRegionAnnouncer(liveRegionRef);

  return (
    <div>
      <div aria-live="polite" ref={liveRegionRef} />
      <button type="button" onClick={() => announcer.announce('Command queued')}>
        Queue command
      </button>
    </div>
  );
}
```

The hook:

- Accepts the `ref` for the live region so the caller decides where to render it.
- Registers global listeners for copy, cut, paste, and Notification API calls.
- Returns helpers (`announce`, `announceCopy`, `announceCut`, `announcePaste`, `announceNotification`) for manual announcements or custom events.

> **Storybook tip:** When building Storybook stories for apps that need the announcer, mount the same component tree snippet above in a decorator so every story renders the live region and shares the announcer helpers.
