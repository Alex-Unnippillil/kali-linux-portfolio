# Kill switch registry

Certain high-risk simulations in the Kali Linux Portfolio can be disabled remotely to protect the lab experience. Each kill switch is controlled with a `NEXT_PUBLIC_KILL_*` environment variable. Setting the variable to `"true"`, `"on"`, or `"enabled"` activates the switch and swaps the app for a maintenance stub.

| App | Flag id | Environment variable | Default |
| --- | --- | --- | --- |
| Hydra | `kill-switch.hydra` | `NEXT_PUBLIC_KILL_HYDRA` | Off |
| Metasploit | `kill-switch.metasploit` | `NEXT_PUBLIC_KILL_METASPLOIT` | Off |
| Metasploit Post | `kill-switch.msf-post` | `NEXT_PUBLIC_KILL_METASPLOIT_POST` | Off |
| Mimikatz / Mimikatz Offline | `kill-switch.mimikatz` | `NEXT_PUBLIC_KILL_MIMIKATZ` | Off |
| John the Ripper | `kill-switch.john` | `NEXT_PUBLIC_KILL_JOHN` | Off |
| Hashcat | `kill-switch.hashcat` | `NEXT_PUBLIC_KILL_HASHCAT` | Off |
| Ettercap | `kill-switch.ettercap` | `NEXT_PUBLIC_KILL_ETTERCAP` | Off |
| Reaver | `kill-switch.reaver` | `NEXT_PUBLIC_KILL_REAVER` | Off |
| dsniff | `kill-switch.dsniff` | `NEXT_PUBLIC_KILL_DNSNIFF` | Off |
| OpenVAS | `kill-switch.openvas` | `NEXT_PUBLIC_KILL_OPENVAS` | Off |
| Nessus | `kill-switch.nessus` | `NEXT_PUBLIC_KILL_NESSUS` | Off |
| Wireshark | `kill-switch.wireshark` | `NEXT_PUBLIC_KILL_WIRESHARK` | Off |
| Kismet | `kill-switch.kismet` | `NEXT_PUBLIC_KILL_KISMET` | Off |
| BeEF | `kill-switch.beef` | `NEXT_PUBLIC_KILL_BEEF` | Off |

The sections below summarise why each switch might be enabled.

## Hydra
Hydra brute-force simulator is paused while credential policies are audited.

## Metasploit
Metasploit module browser is offline while exploit catalog updates are reviewed.

## Metasploit Post
Metasploit post-exploitation lab is paused during safety content review.

## Mimikatz
Credential extraction demo is disabled pending compliance verification.

## John the Ripper
Password cracking lab is offline while demo wordlists are refreshed.

## Hashcat
Hashcat GPU simulation is paused while load tests complete.

## Ettercap
Man-in-the-middle lab is disabled while network policies update.

## Reaver
WPS attack simulation is offline during compliance validation.

## dsniff
Packet sniffing lab is suspended while capture logs are archived.

## OpenVAS
OpenVAS simulation is paused while vulnerability feeds update.

## Nessus
Nessus dashboard is temporarily offline during plugin refresh.

## Wireshark
Packet capture sandbox is disabled while trace samples are sanitised.

## Kismet
Wireless survey demo is paused while datasets rotate.

## BeEF
BeEF social engineering sandbox is unavailable while safety scripts are reviewed.
