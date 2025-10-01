# Hydra Credential Playbooks

The Hydra simulation now ships with a "Credential playbooks" panel for planning
red-team credential sprays without ever storing live secrets.

## Safe usage guidelines

- **Only log anonymized data.** Replace real usernames and passwords with role
  names, password composition patterns, or MFA notes.
- **Do not paste secrets.** The UI warns when clipboard data looks sensitive,
  but it will still store whatever you enter. Sanitize the text before saving.
- **Exported files are redacted.** JSON exports automatically mask secret-like
  strings and are intended for tabletop exercises or documentation.
- **Stay client-side.** Entries live in the browser using encrypted storage;
  clearing the browser data removes them.
- **Simulation only.** This feature documents hypothetical attack paths. Do not
  connect it to real infrastructure or use it to launch attacks.

## Disclaimers

The credential manager is an educational aid. It cannot guarantee that data you
enter is free of secrets—review every record before saving or sharing exports.
Neither the maintainers nor contributors assume liability for misuse.
