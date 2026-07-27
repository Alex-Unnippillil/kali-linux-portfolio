# Metasploit Post simulator scenarios

> ⚠️ For educational use in authorized lab environments only. The simulator never triggers live post-exploitation activity. All transcripts and reports are canned for tabletop planning.

The Metasploit Post desktop app now ships with a structured catalog of training scenarios. Each module exposes:

- A **command builder** that assembles a multi-line `msfconsole` snippet from lab-safe defaults and toggleable datastore options.
- A **canned transcript** that replays realistic module output without touching production systems.
- A **post-exploitation report** summarizing objectives, key findings, remediation actions, and artifacts to hand off to the blue team.

Module definitions live in `components/apps/msf-post/modules.js` so the UI and automated tests can load the same source of truth.

## Scenario catalog

### Local Exploit Suggester (`post/multi/recon/local_exploit_suggester`)
- **Scenario:** Pivot from a phishing foothold on a Windows 10 engineering workstation inside lab VLAN 20.
- **Objective:** Identify escalation paths without modifying the host during a tabletop drill.
- **Highlights:** AlwaysInstallElevated registry keys left enabled, vulnerable Zemana AntiLogger service, PrintNightmare already mitigated.
- **Recommended actions:** Remove MSI elevation policies, upgrade or remove Zemana AntiLogger, maintain monthly spooler patches.
- **Artifacts:** `host-fingerprint.json` inventory export documenting build info and logged-on users.

### Enable RDP (`post/windows/manage/enable_rdp`)
- **Scenario:** Maintain access to a lab Windows Server 2019 jump host.
- **Objective:** Keep RDP available for detection drills while enforcing hardened settings.
- **Highlights:** TermService verified running, "Lab RDP" firewall rule scoped to 10.10.20.0/24, Network Level Authentication confirmed.
- **Recommended actions:** Rotate staging credentials after the exercise and remove temporary firewall rules.
- **Artifacts:** `rdp-validation.txt` transcript of `qwinsta` and `Test-NetConnection` validation commands.

### Enumerate Network (`post/linux/gather/enum_network`)
- **Scenario:** Linux pivot established on an Ubuntu 22.04 bastion within the lab staging subnet.
- **Objective:** Map adjacent subnets and VPN tunnels before lateral-movement drills.
- **Highlights:** DMZ interface at 172.20.5.14/24, staging VPN via tun0 into 10.30.0.0/16, SSH proxy configuration revealed.
- **Recommended actions:** Audit unused VPN profiles, enforce MFA for lab operators, and harden host-based firewalls.
- **Artifacts:** `enum-network-lab.json` structured export and `ssh-config-snippet.txt` describing proxy usage.

### Autoroute Manager (`post/multi/manage/autoroute`)
- **Scenario:** Coordinate lateral movement rehearsals across segmented lab networks.
- **Objective:** Track pivot routes for a red/blue joint exercise with clear rollback steps.
- **Highlights:** Baseline routes for 10.40.0.0/16 and 10.30.0.0/16 preserved, 10.60.12.0/24 staged via session 4, autoroute journal updated with timestamps.
- **Recommended actions:** Purge temporary autoroute entries after the engagement and document cleanup in change tickets.
- **Artifacts:** `autoroute-journal.json` ledger of pivot routes captured during the session.

## Command builder toggles

Each module exposes toggleable datastore options so facilitators can demonstrate safe variants:

| Module | Toggle | Default | Purpose |
| --- | --- | --- | --- |
| Local Exploit Suggester | `VERBOSE` | On | Adds exploit scoring notes to the transcript. |
| Local Exploit Suggester | `DRY_RUN` | On | Prevents payload execution during labs. |
| Enable RDP | `CREATE_FIREWALL_RULE` | On | Adds a scoped TCP/3389 allow rule for the lab management network. |
| Enable RDP | `ENABLE_NLA` | On | Ensures Network Level Authentication remains enforced. |
| Enable RDP | `PERSIST` | Off | Tracks persistence as a deferred task instead of applying changes. |
| Enumerate Network | `INCLUDE_ROUTES` | On | Captures routing-table summaries in the transcript. |
| Enumerate Network | `INCLUDE_VPN` | Off | Parses VPN profiles for split-tunnel indicators. |
| Autoroute Manager | `LIST_ROUTES` | On | Baselines existing pivot routes before modifications. |
| Autoroute Manager | `SAVE_REPORT` | On | Appends updates to the autoroute journal artifact. |

Use the command builder to demonstrate how these toggles translate into `set` statements before calling `run`. The simulator’s Jest suite (`__tests__/msf-post.test.tsx`) asserts that toggles and report content render correctly so future scenario updates stay covered.
