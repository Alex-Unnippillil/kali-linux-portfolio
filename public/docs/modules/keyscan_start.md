# keyscan_start

Begin recording keystrokes from the compromised machine.

## Overview
- Hooks into the active Meterpreter session keyboard buffer.
- Streams keystrokes back to the operator console.

## Options

| Name | Required | Description |
| ---- | -------- | ----------- |
| SESSION | Yes | ID of the session to monitor. |

## Usage
1. Launch `keyscan_start` against a live session.
2. Use `keyscan_dump` periodically to review captured input.
3. Stop collection with `keyscan_stop` when complete.

## Notes
- Captured keystrokes stay within this educational sandbox.
- Use real tooling only with explicit authorization.
