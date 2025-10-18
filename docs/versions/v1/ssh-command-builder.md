# SSH Command Builder presets

The SSH Command Builder app ships with a small library of reusable host presets to save typing during demos. Each preset is
defined in [`apps/ssh/config.ts`](../apps/ssh/config.ts) and follows this interface:

```ts
interface SSHConfig {
  user: string;
  host: string;
  port: string;
  identityFile: string;
  useCompression: boolean;
  enableAgentForwarding: boolean;
  extraOptions: string;
}

interface SSHPreset {
  id: string;
  label: string;
  description: string;
  config: SSHConfig;
}
```

## Adding or editing presets

1. Open `apps/ssh/config.ts` and update the `SSH_PRESETS` array.
2. Use memorable `id` values (`kebab-case`) because they are saved in state.
3. Keep `label` short; it renders inside a `<select>` element.
4. `description` should give operators quick context (lab, cloud sandbox, etc.).
5. Store only simulated hosts or placeholder IPs/domains. Never commit real infrastructure details.
6. If you add options that rely on the SSH client (`-o` flags), include them in `extraOptions`.

## Default configuration

The empty form is derived from `DEFAULT_SSH_CONFIG`. Reuse that constant if you need to reset the builder to a pristine state or
when writing unit tests.

