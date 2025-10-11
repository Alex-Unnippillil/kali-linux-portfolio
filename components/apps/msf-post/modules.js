export const DEFAULT_CHECKLIST = [
  'Capture host context and access level',
  'Select and stage the post-exploitation module',
  'Document findings for blue-team handoff',
  'Schedule cleanup tasks for the end of the lab run',
];

export const MODULE_CATALOG = [
  {
    id: 'local_exploit_suggester',
    displayName: 'Local Exploit Suggester',
    path: 'post/multi/recon/local_exploit_suggester',
    description:
      'Examines the compromised host for known local privilege escalation avenues and ranks them by reliability.',
    options: [
      {
        name: 'SESSION',
        label: 'Session ID',
        value: '1',
        helper: 'Active Meterpreter session that the suggester should evaluate.',
      },
      {
        name: 'OS_HINT',
        label: 'Target OS hint',
        value: 'Windows 10 21H2',
        helper: 'Used for narrative context in reports; does not change execution.',
      },
    ],
    toggles: [
      {
        name: 'VERBOSE',
        label: 'Enable verbose ranking output',
        description: 'Include exploit scoring notes and patch state observations in the transcript.',
        value: 'true',
        default: true,
      },
      {
        name: 'DRY_RUN',
        label: 'Dry run only (no payloads)',
        description: 'Simulate exploitation steps so the module never alters the lab host.',
        value: 'true',
        default: true,
      },
    ],
    checklist: [
      'Collect fingerprint and patch level details',
      'Score available escalation exploits',
      'Summarize mitigations for each candidate',
    ],
    report: {
      scenario:
        'Pivot from phishing foothold on a Windows 10 engineering workstation inside the lab VLAN 20 segment.',
      objective:
        'Identify privilege-escalation paths without modifying the workstation during a tabletop readiness drill.',
      summary:
        'The Local Exploit Suggester compared host patch levels against Rapid7 coverage and highlighted MSI policy abuse vectors.',
      highlights: [
        'AlwaysInstallElevated registry keys remained enabled in both HKLM and HKCU hives, allowing MSI-based elevation.',
        'Stale Zemana AntiLogger 3.5 service permitted service DLL planting with SYSTEM privileges.',
        'PrintNightmare (CVE-2021-34527) mitigations already applied; module skipped exploitation attempts.',
      ],
      remediation: [
        'Remove AlwaysInstallElevated policies and enforce signed installer requirements.',
        'Upgrade or remove Zemana AntiLogger to eliminate vulnerable driver load paths.',
        'Maintain monthly patch cadence for spoolsv-related vulnerabilities.',
      ],
      notes: [
        'No persistence was established; cleanup limited to clearing generated module artifacts.',
      ],
      artifacts: [
        {
          name: 'host-fingerprint.json',
          description: 'Inventory export describing kernel build, logged-on users, and privilege level.',
        },
      ],
    },
    sampleOutput: `msf6 post(multi/recon/local_exploit_suggester) > run
[*] 192.168.56.23 - Collecting local exploits for x64/windows...
[*] 192.168.56.23 - 10 exploit checks are being tried...
[+] 192.168.56.23 - exploit/windows/local/always_install_elevated: The target is vulnerable.
[+] 192.168.56.23 - exploit/windows/local/service_permissions: Unquoted path found in Zemana AntiLogger service.
[*] 192.168.56.23 - exploit/windows/local/printnightmare: Target appears patched; skipping.
[*] Post module execution completed in 13.42 seconds.
`,
  },
  {
    id: 'enable_rdp',
    displayName: 'Enable RDP',
    path: 'post/windows/manage/enable_rdp',
    description:
      'Configures Remote Desktop Protocol and firewall policies to maintain remote access during the lab exercise.',
    options: [
      {
        name: 'SESSION',
        label: 'Session ID',
        value: '2',
        helper: 'Meterpreter session that already runs with administrative privileges.',
      },
      {
        name: 'USERNAME',
        label: 'Staging account',
        value: 'lab-admin',
        helper: 'Optional local user to verify sign-in after RDP is enabled.',
      },
    ],
    toggles: [
      {
        name: 'CREATE_FIREWALL_RULE',
        label: 'Create firewall exception',
        description: 'Adds TCP/3389 inbound allow rule scoped to the lab management network.',
        value: 'true',
        default: true,
      },
      {
        name: 'ENABLE_NLA',
        label: 'Require Network Level Authentication',
        description: 'Keeps RDP hardened in the lab by enforcing NLA.',
        value: 'true',
        default: true,
      },
      {
        name: 'PERSIST',
        label: 'Document persistence tasks',
        description: 'Track follow-up tasks instead of applying persistence automatically.',
        value: 'false',
        default: false,
      },
    ],
    checklist: [
      'Confirm administrative rights on the target',
      'Enable RDP service and supporting firewall rules',
      'Document validation steps and cleanup reminders',
    ],
    report: {
      scenario: 'Post-exploitation control maintenance on a lab Windows Server 2019 jump host.',
      objective:
        'Ensure RDP connectivity for blue-team detection drills while maintaining lab-safe hardening settings.',
      summary:
        'RDP service confirmed active, firewall exception limited to 10.10.20.0/24, and validation notes captured for after-action review.',
      highlights: [
        'TermService set to auto-start and verified in the running state.',
        'Windows Defender Firewall inbound rule "Lab RDP" created and scoped to 10.10.20.0/24.',
        'Network Level Authentication remained enforced to mirror production posture.',
      ],
      remediation: [
        'Rotate staging credentials after the exercise completes.',
        'Remove the temporary RDP rule and revert to jump-box-only access.',
      ],
      notes: [
        'Persistence tasks deferred to change-management ticket LAB-4271.',
      ],
      artifacts: [
        {
          name: 'rdp-validation.txt',
          description: 'Transcript of qwinsta and Test-NetConnection validation commands.',
        },
      ],
    },
    sampleOutput: `msf6 post(windows/manage/enable_rdp) > run
[*] 10.10.20.15 - Checking current Terminal Services configuration...
[+] 10.10.20.15 - RDP service already running.
[+] 10.10.20.15 - Created firewall rule "Lab RDP" for TCP/3389 (scope: 10.10.20.0/24).
[*] 10.10.20.15 - Verifying Network Level Authentication requirements remain enabled.
[*] Post module execution completed in 4.87 seconds.
`,
  },
  {
    id: 'enum_network',
    displayName: 'Enumerate Network',
    path: 'post/linux/gather/enum_network',
    description:
      'Collects interface, routing, and VPN details from a compromised Linux pivot point.',
    options: [
      {
        name: 'SESSION',
        label: 'Session ID',
        value: '3',
        helper: 'Meterpreter session tied to the Linux host acting as a pivot.',
      },
      {
        name: 'SAVE_TO',
        label: 'Report artifact name',
        value: 'enum-network-lab.json',
        helper: 'Filename used when exporting structured findings.',
      },
    ],
    toggles: [
      {
        name: 'INCLUDE_ROUTES',
        label: 'Capture routing table',
        description: 'Adds `ip route` and `netstat -rn` summaries to the transcript.',
        value: 'true',
        default: true,
      },
      {
        name: 'INCLUDE_VPN',
        label: 'Capture VPN profiles',
        description: 'Parses common VPN directories for split-tunnel indicators.',
        value: 'true',
        default: false,
      },
    ],
    checklist: [
      'Identify pivot network interfaces and addresses',
      'Review routing table for internal segments',
      'Note VPN or split tunnel configurations',
    ],
    report: {
      scenario: 'Linux pivot established on an Ubuntu 22.04 bastion within the lab staging subnet.',
      objective: 'Map adjacent subnets and VPN connections before launching lateral-movement drills.',
      summary:
        'Interface inventory captured with clear segmentation between DMZ and engineering VLANs; VPN profile artifacts catalogued for review.',
      highlights: [
        'eth0 bridged into DMZ (172.20.5.14/24) with default route via 172.20.5.1.',
        'tun0 interface revealed staging VPN into 10.30.0.0/16 with split-tunnel configuration.',
        'SSH config snippet exposed ProxyCommand usage toward lab jump host.',
      ],
      remediation: [
        'Audit bastion host for unnecessary VPN profiles and enforce MFA for lab operators.',
        'Segment DMZ access by enforcing host-based firewall policies on the pivot.',
      ],
      notes: [
        'Structured data exported to enum-network-lab.json for the blue-team packet-capture replay.',
      ],
      artifacts: [
        {
          name: 'enum-network-lab.json',
          description: 'JSON export of interface, route, and VPN metadata.',
        },
        {
          name: 'ssh-config-snippet.txt',
          description: 'Scrubbed SSH configuration referencing proxy jump hosts.',
        },
      ],
    },
    sampleOutput: `msf6 post(linux/gather/enum_network) > run
[*] 172.20.5.14 - Collecting interface information...
[+] 172.20.5.14 - eth0 -> 172.20.5.14/24 (DMZ)
[+] 172.20.5.14 - tun0 -> 10.30.12.6/24 (Staging VPN)
[*] 172.20.5.14 - Capturing routing table entries...
[+] 172.20.5.14 - Default route via 172.20.5.1 dev eth0
[*] Post module execution completed in 3.12 seconds.
`,
  },
  {
    id: 'autoroute',
    displayName: 'Autoroute Manager',
    path: 'post/multi/manage/autoroute',
    description:
      'Manages pivot routes and provides ready-made summaries for the lab engagement journal.',
    options: [
      {
        name: 'SESSION',
        label: 'Session ID',
        value: '4',
        helper: 'Session tied to the pivot listener that should host the route.',
      },
      {
        name: 'SUBNET',
        label: 'Subnet to add',
        value: '10.60.12.0/24',
        helper: 'Target subnet discovered during network enumeration.',
      },
    ],
    toggles: [
      {
        name: 'LIST_ROUTES',
        label: 'List existing routes before changes',
        description: 'Includes a snapshot of current pivot routes for auditability.',
        value: 'true',
        default: true,
      },
      {
        name: 'SAVE_REPORT',
        label: 'Append to autoroute journal',
        description: 'Adds a JSON entry to autoroute-journal.json for handoff documentation.',
        value: 'true',
        default: true,
      },
    ],
    checklist: [
      'Baseline current autoroute table',
      'Stage new pivot routes needed for the scenario',
      'Record changes in the engagement journal',
    ],
    report: {
      scenario: 'Coordinated lateral movement rehearsal across segmented lab networks.',
      objective: 'Track pivot routes for red/blue joint exercise while keeping rollback steps clear.',
      summary:
        'Autoroute added 10.60.12.0/24 via session 4 and logged entries for the exercise debrief.',
      highlights: [
        'Existing routes: 10.40.0.0/16 via session 2, 10.30.0.0/16 via session 3.',
        'New route 10.60.12.0/24 registered and propagated to pivot listeners.',
        'Journal updated with timestamped change log for blue-team review.',
      ],
      remediation: [
        'Purge temporary autoroute entries post-engagement to restore baseline.',
      ],
      notes: [
        'No packets forwarded during the dry run; changes captured for tabletop replay only.',
      ],
      artifacts: [
        {
          name: 'autoroute-journal.json',
          description: 'Ledger of pivot routes added during the exercise.',
        },
      ],
    },
    sampleOutput: `msf6 post(multi/manage/autoroute) > run
[*] 10.10.40.12 - Listing active routes (2 entries)
[+] Route: 10.40.0.0/16 via 10.10.40.12 (session 2)
[+] Route: 10.30.0.0/16 via 10.10.30.9 (session 3)
[*] 10.10.40.12 - Adding route to 10.60.12.0/24 via session 4
[+] Autoroute change staged for lab review. No traffic forwarded in dry-run mode.
`,
  },
];
