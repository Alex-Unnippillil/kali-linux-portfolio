# persistence_service

Install a Windows service to maintain Meterpreter access.

## Overview
- Creates a resilient service that reconnects to the handler.
- Useful for regaining access after a reboot.

## Options

| Name | Required | Description |
| ---- | -------- | ----------- |
| SESSION | Yes | ID of the session to persist. |
| RPORT | No | Callback port for the service payload. |

## Usage
1. Confirm the target permits service creation.
2. Configure callback parameters and run the module.
3. Verify the service appears in the Windows Service Manager.

## Notes
- This environment simulates success without touching real hosts.
- Always obtain authorization before deploying persistence mechanisms.
