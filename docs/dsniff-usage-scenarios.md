# dsniff Simulator Usage Scenarios

> ⚠️ For educational use inside authorized lab environments only. The simulator never executes real network attacks.

## 1. Inspect canned outputs

1. Launch the **dsniff** app from the desktop grid.
2. In the **Canned output library**, browse between the `urlsnarf` and `arpspoof` tabs.
3. Each panel renders sanitized fixture data so learners can practice parsing HTTP requests and ARP poisoning responses without touching live infrastructure.

## 2. Build safe commands

1. Review the lab banner and toggle **Lab mode** on when you are ready to explore command syntax.
2. Use the **Safe command builder** to select a tool, demo interface, and capture source.
3. Copy the generated command to share during workshops. All presets reference demo interfaces and `.pcap` files bundled with the app.

## 3. Trace credential exposure

1. Scroll to the **PCAP credential leakage demo** and select any session tile.
2. Copy sanitized rows to highlight how credentials travel in the capture.
3. Use the remediation list to reinforce best practices such as TLS enforcement and MFA adoption.

## 4. Summarize domains and credentials

1. Review the **Parsed credentials/URLs by domain** table for aggregated host risk.
2. Export the summary to share with students or team members.
3. Emphasize that all records originate from curated fixtures, keeping the workflow non-destructive.
