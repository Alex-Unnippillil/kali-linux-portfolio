# System Tray

The desktop UI now exposes a unified system tray that accepts modern
[StatusNotifierItem](https://www.freedesktop.org/wiki/Specifications/StatusNotifierItem/)
icons with a graceful fallback to legacy systray imagery.
Icons are grouped together for accessibility and discoverability.

## Usage

Wrap your app with `TrayProvider` (already included in `_app.jsx`) and
use the `useTray` hook to register or remove simulated tray icons.
When an SNI icon is provided it will be preferred; if omitted the legacy
icon path is used instead.

```tsx
import { useTray } from '../hooks/useTray';
import { useEffect } from 'react';

export default function DemoIcon() {
  const { register, unregister } = useTray();

  useEffect(() => {
    register({
      id: 'demo',
      sni: '/icons/demo-symbolic.svg',
      legacy: '/icons/demo.png',
      tooltip: 'Demo app',
    });
    return () => unregister('demo');
  }, [register, unregister]);

  return null;
}
```

This API enables simulated applications to surface status, background
activity or quick actions directly in the tray area while maintaining
backward compatibility with traditional systray icons.
