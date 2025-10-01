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

## Exporting simulated results

The Nmap NSE desktop app now includes an **Export results** panel beneath the sample output. Use it to stream the parsed host, port, and script rows to either CSV (for spreadsheets) or JSON Lines (for pipelines). Large captures are chunked in-browser so that even 500k-row exports finish without exhausting memory.

1. Choose CSV or JSONL and review the total row count calculated from the current script filters.
2. Check the host/port/script fields you need. Only the selected fields appear in the exported file header.
3. Toggle redaction rules as required. IPs and credentials are masked by default, and script output can be truncated before export.
4. Click **Export** to begin streaming. The progress bar tracks row counts and you can cancel mid-stream if needed. When complete, the file is downloaded with a timestamped filename.

The export routine validates that every generated row matches the progress counter before finalizing the download, helping catch data mismatches early.

