# getsystem

Gain SYSTEM privileges on a compromised Windows host.

## Overview
- Elevates the current Meterpreter session to `NT AUTHORITY\\SYSTEM`.
- Attempts multiple techniques, falling back when a method fails.

## Options

| Name | Required | Description |
| ---- | -------- | ----------- |
| SESSION | Yes | ID of the session to elevate. |

## Usage
1. Ensure you have an active Windows Meterpreter session.
2. Run `run post/windows/escalate/getsystem`.
3. Verify the session now runs as SYSTEM.

## Notes
- This simulation never executes real privilege escalation.
- Review the official Metasploit module README for production usage.
