# WASM Runtime Harness

This project ships a lightweight WebAssembly runtime wrapper that standardises how
modules are fetched, instantiated, pooled, and sandboxed. Use it to integrate
new compute-heavy helpers while keeping the UI responsive and fallbacks safe.

## Feature flagging

WebAssembly paths are disabled whenever the runtime cannot probe the necessary
capabilities **or** when a feature flag requests a fallback. The runtime looks at
these flags in order:

1. `NEXT_PUBLIC_ENABLE_WASM_RUNTIME`
2. `ENABLE_WASM_RUNTIME`
3. `globalThis.__KALI_FEATURES__?.wasmRuntime`

Accepted values (case insensitive) are `enabled`, `disabled`, `true`, `false`,
`on`, `off`, `1`, or `0`. When no overrides are present the runtime uses the
feature whenever `WebAssembly` is available in the current environment.

## Loading modules

Use `loadWasmModule` from `wasm/runtime.ts` to bootstrap a module. The helper:

- Reuses `WebAssembly.Memory` objects via opt-in pools so several modules can
  share the same backing store.
- Configures imports (providing a default `env.memory` binding when needed).
- Times out fetch/instantiation attempts so failures do not hang the UI.
- Falls back to the supplied JS implementation on errors, disabled flags, or
  environments without WASM support.
- Optionally spins up a dedicated worker. The inline worker is limited to
  modules without custom imports—provide a `WorkerFactory` if you need a custom
  script.

```ts
const handle = await loadWasmModule<MyExports>({
  name: 'demo-module',
  moduleUrl: '/modules/demo.wasm',
  memory: { initial: 2, maximum: 4, shared: true, pool: 'demo-pool' },
  importObject: ({ capabilities }) => ({
    env: {
      abort: () => console.warn('abort from demo-module'),
      supportsThreads: capabilities.threads,
    },
  }),
  fallback: () => ({ /* JS implementation */ }),
});

// Use the exports
handle.exports.doWork();

// Release when done to decrement the memory pool reference count
handle.release();
```

Call `resetWasmRuntimeState()` in tests to clear caches and memory pools.

## Sample module: hash accelerator

`wasm/hashModule.ts` demonstrates the runtime with a tiny WASM module that sums
bytes for a lightweight hashing helper. The helper automatically falls back to a
JS implementation when WASM is unavailable:

```ts
const accelerator = await createHashAccelerator();
const digest = accelerator.hash('hello world');
accelerator.release();
```

## Onboarding checklist for new modules

1. **Decide on the entry point.** Create a helper similar to
   `wasm/hashModule.ts` that wraps WASM exports in a friendly API and provides a
   JS fallback.
2. **Use memory pools.** Declare a `memory.pool` key when multiple modules can
   reuse the same configuration. This avoids redundant allocations.
3. **Limit capabilities.** Keep imports explicit and lean. Probe optional
   features via the `capabilities` field instead of assuming availability.
4. **Add tests.** Cover both the WASM and fallback paths. Tests should call
   `resetWasmRuntimeState()` between runs to avoid shared state.
5. **Document flags.** Note any new feature toggles in this file or the relevant
   app README.
6. **Review worker needs.** If a module must run off the main thread and
   requires custom imports, provide a bespoke `WorkerFactory` so the runtime can
   load the correct script.

Following this checklist keeps new modules sandboxed, debuggable, and easy to
ship across environments that may lack WebAssembly.
