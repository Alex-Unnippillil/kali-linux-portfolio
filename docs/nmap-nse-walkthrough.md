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

## Batch simulator usage

The **Batch simulator** built into the desktop app lets you rehearse how multiple
parameter sets would be orchestrated without touching any production network.

- Queue the current target and script selection, then start the batch to replay
  curated results.
- Concurrency is capped to four simulated workers to keep the UI responsive and
  highlight real-world scheduling concerns.
- Each task retries up to two times. Failures include clear explanations— for
  example, the DNS brute-force sample intentionally times out on the first pass
  to demonstrate throttling requirements.
- Cancelling stops the in-browser worker immediately and marks queued entries as
  never executed.

> Safety note: the simulator never emits network traffic. All output is
> pre-recorded for education and should only be used to explain Nmap workflows
> in authorized lab settings.

