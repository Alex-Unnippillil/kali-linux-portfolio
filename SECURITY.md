# Security Policy

The Kali Linux Portfolio is a simulated desktop environment built with Next.js. This policy explains which parts of the project are in scope for security review, how to report issues responsibly, and what to expect after submitting a report.

## Scope

The following assets are **in scope** for vulnerability reports:

- Application code in this repository, including the Next.js pages under `pages/`, React components in `components/`, hooks, utilities, workers, and serverless API stubs in `pages/api/`.
- Static assets served from this project (`public/`, `quotes/`, `games/`, etc.) and any build or deployment scripts maintained here.
- Hosted deployments of this portfolio at [https://unnippillil.com](https://unnippillil.com) or other domains managed by the project maintainer.

The following items are **out of scope**:

- Third-party services, APIs, or embeds (e.g., EmailJS, StackBlitz, Spotify, YouTube) and vulnerabilities that originate solely in upstream dependencies.
- Issues caused by running modified builds, non-standard browser extensions, or unsupported configurations.
- Social engineering, denial-of-service load testing, spam, or automated brute force against demo endpoints.

If you are unsure whether a finding is in scope, please reach out for clarification before proceeding.

## Reporting a Vulnerability

Email security findings to **alex.unnippillil@hotmail.com** with the subject line `Security Report: <short summary>`. Please include the following details:

1. A concise description of the vulnerability and the affected component or URL.
2. Step-by-step reproduction instructions or proof-of-concept code.
3. Expected vs. actual behavior.
4. Any relevant logs, screenshots, or impact analysis.

Do not disclose the issue publicly until it has been triaged and fixed. At this time there is no bug bounty or monetary reward program.

## Response Timeline

- **Acknowledgement:** You should receive confirmation that your report was received within **3 business days**.
- **Initial assessment:** Triage and determination of severity typically occurs within **7 business days**.
- **Remediation:** Fixes aim to be developed, tested, and deployed within **30 days** for high/critical issues and **90 days** for lower-severity findings. You will be notified if remediation requires more time.

If you do not receive a timely acknowledgement, please resend your report or try the alternative contact listed in the About app within the portfolio UI.

## Secure Communications

A dedicated PGP key is **not** currently published for this project. If you need to exchange encrypted details, mention this in your report email so that a secure channel (e.g., temporary PGP key or encrypted file share) can be arranged.

Thank you for helping keep the Kali Linux Portfolio and its users safe.
