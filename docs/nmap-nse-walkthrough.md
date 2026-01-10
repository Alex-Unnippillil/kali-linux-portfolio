# Nmap NSE Walkthrough (Simulation)

> ⚠️ For educational use in authorized lab environments only.

This guide shows how an Nmap scan using the default vulnerability scripts might appear and lists defensive steps to mitigate such reconnaissance.

## Example Command

```
nmap -sV --script vuln 10.0.0.5
```

- `-sV` enables service and version detection.
- `--script vuln` runs safe vulnerability check scripts bundled with Nmap.

## Static Example Output

```
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1
80/tcp open  http    Apache httpd 2.4.52
443/tcp closed https
```

This output is a canned sample; the simulation never contacts a real host.

## Defensive Measures

- Restrict inbound traffic using firewalls and disable unused ports.
- Monitor logs for repeated scans or NSE script fingerprints.
- Patch exposed services so known vulnerabilities are not present.

## Comparing scan runs

The desktop simulation now includes a comparison workspace that highlights
differences between stored scan runs. The component reads structured data from
`public/demo-data/nmap/run-history.json`. Each run entry should provide:

- `id`, `label`, and optional `notes` for display context.
- `startedAt` (ISO timestamp) so the UI can build timelines.
- `profile`, which is the simulated command that produced the output.
- `hosts`, an array of host objects with `address`, optional `hostname`, and a
  `ports` array. Each port entry should include `port`, `protocol`, `state`, and
  `service`, with optional `product` or `reason` metadata.

When two runs are selected the React component fans the comparison out to a pool
of web workers. Each worker receives a subset of the hosts to diff so that even
large JSON artefacts finish within two seconds. Additions, removals, and state
changes are summarised with filters to focus on specific hosts or change types.

To add new demo data:

1. Extend `public/demo-data/nmap/run-history.json` with another object in the
   `runs` array following the schema above.
2. Provide a unique `id` and timestamp, keeping port states truthful to the
   narrative you want to tell (e.g. open → filtered to simulate firewall
   changes).
3. Re-run `yarn test` to ensure the diff engine and UI snapshots continue to
   pass.

