# TypeScript strictness migration

This release increases compiler strictness and introduces new typed utilities.

## Highlights
- Enabled `noImplicitOverride` to surface accidental method overrides.
- Added generics-based helpers for persistent storage with runtime validation.
- Converted frequently reused game components to TypeScript for better reuse.
- Introduced discriminated unions for window manager actions.

These changes fix subtle runtime issues around untyped gamepad events and window
session handling. Components consuming these APIs may require minor type
adjustments when upgrading.
