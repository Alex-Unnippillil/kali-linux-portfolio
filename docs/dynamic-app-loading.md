# Dynamic App Loading

This project uses a helper named `createDynamicApp` to load application components
on demand. The helper wraps `next/dynamic` with `ssr: false` so apps are only
rendered in the browser and a loading message is displayed while the bundle is
fetched.

```tsx
import createDynamicApp from '../lib/createDynamicApp';

// Load `components/apps/my-tool` dynamically with SSR disabled
const MyTool = createDynamicApp('my-tool', 'My Tool');

export default MyTool;
```

## Registering a new app

1. Create your app under `components/apps/<id>` and export a default component.
2. Add an entry to `dynamicAppEntries` in `apps.config.js`:
   ```js
   const dynamicAppEntries = [
     ['my-tool', 'My Tool'],
     // ...existing entries
   ];
   ```
   The configuration will call `createDynamicApp('my-tool', 'My Tool')` for you.
3. Run `yarn lint` to ensure there are no direct imports from `components/apps`.

Direct imports from `components/apps/*` are restricted by ESLint. Use
`createDynamicApp` instead so future apps are loaded dynamically with
`ssr: false`.
