# Reaver Handshake Lab Notes

The Reaver simulator is a **teaching aid** for explaining WPA/WPA2/WPS handshakes
without ever transmitting over the air. The updated component introduces:

- Curated Wi-Fi handshake fixtures for WPA2, WPS PIN workflows, and PEAP labs.
- Command builders that wrap every example with `printf` to ensure **no packets are
  emitted** when students copy the command.
- Results interpretation panels that highlight risk, defense, and clean-up actions for
  lab-only hardware.

## Educational guardrails

- These flows are for **owned lab environments only**. Dataset metadata references
  Raspberry Pi APs, OpenWrt routers, and FreeRADIUS stacks that ship with revoked
  credentials after each workshop.
- Every command string is rendered as `printf "Simulated command: %s\n" "…"`, keeping the
  simulator firmly in "explain" mode.
- Lab notices remind facilitators to rotate credentials, keep routers isolated, and scrub
  logs before sharing captures.

## Instructor checklist

1. Pick the dataset that aligns with your session (WPA2 baseline, WPS throttle, or PEAP).
2. Walk through the message timeline and discuss where the attack surface exists.
3. Copy the `printf` commands into your slides or lab sheet so students see the syntax
   without launching real tooling.
4. Review the interpretation cards to reinforce remediation tactics before moving to the
   next module.

The component is intentionally self-contained so it can be embedded in training decks or
printed as a PDF for offline classroom use.
