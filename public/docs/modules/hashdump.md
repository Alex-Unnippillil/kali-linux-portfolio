# hashdump

Extract password hashes from the Windows SAM database.

## Overview
- Reads the SAM and SYSTEM hives from the compromised host.
- Decrypts cached credentials for offline password analysis.

## Options

| Name | Required | Description |
| ---- | -------- | ----------- |
| SESSION | Yes | ID of the session to target. |

## Usage
1. Run the module once SYSTEM privileges are obtained.
2. Export hashes for offline cracking tools like `john` or `hashcat`.
3. Rotate credentials after testing to maintain good hygiene.

## Notes
- This simulation returns sample hashes only.
- Never process real credentials outside an approved lab.
