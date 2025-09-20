# 2Wire XSLT Password Reset (Simulated)

This simulated README walks through the high-level workflow of the Metasploit module.
It is designed for educational purposes only.

## Overview

The auxiliary module triggers the administrative password reset form exposed on
legacy 2Wire gateways. The simulated exploit highlights:

- Discovering the management endpoint at `http://192.168.0.1/xslt`.
- Issuing a crafted POST request that resets credentials without prior auth.
- Reviewing logs to understand what changes were applied.

## Options

| Option  | Required | Default     | Description                              |
| ------- | -------- | ----------- | ---------------------------------------- |
| RHOSTS  | Yes      | 192.168.0.1 | Address range that will be enumerated.   |
| RPORT   | No       | 80          | HTTP service port.                       |
| SSL     | No       | false       | Toggle HTTPS when the gateway supports it. |

## Usage walkthrough

1. Enumerate the network to locate 2Wire devices.
2. Launch the module with valid `RHOSTS` targets.
3. Verify the console output for `[*] Password reset scheduled`.
4. Notify impacted stakeholders that credentials were reset.

### Post exploitation tips

- Update the firmware immediately after regaining access.
- Replace default passwords with randomly generated phrases.
- Audit the gateway for additional misconfigurations.

## Further reading

For real-world guidance review the vendor advisory and the
[Metasploit module documentation](https://docs.metasploit.com/docs/modules/).
