#!/usr/bin/env python3
"""Captive portal detection helper.

This module probes well-known connectivity check URLs and reports whether a
captive portal intercepts the traffic. On detection, it launches a sandboxed
WebKit browser session so the user can complete the sign-in flow without
polluting their primary browser profile.
"""
from __future__ import annotations

import argparse
import dataclasses
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Iterable, List, Optional
from urllib.error import URLError
from urllib.request import Request, urlopen


LOG = logging.getLogger("captive_portal")

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

CAPTIVE_KEYWORDS = [
    "captive", "login", "portal", "sign in", "authenticate", "hotspot"
]


@dataclasses.dataclass
class ProbeTarget:
    """Definition of a network probe."""

    url: str
    expected_status: int
    expect_empty_body: bool = True
    name: Optional[str] = None


@dataclasses.dataclass
class ProbeResult:
    """Outcome of probing a target."""

    target: ProbeTarget
    status: Optional[int]
    body_excerpt: str
    elapsed: float
    error: Optional[str] = None

    @property
    def suspected_captive(self) -> bool:
        if self.error:
            return True
        if self.status != self.target.expected_status:
            return True
        if self.target.expect_empty_body and self.body_excerpt.strip():
            return True
        lowered = self.body_excerpt.lower()
        return any(keyword in lowered for keyword in CAPTIVE_KEYWORDS)


PROBE_TARGETS: List[ProbeTarget] = [
    ProbeTarget("http://connectivitycheck.gstatic.com/generate_204", 204, True, "Google Connectivity"),
    ProbeTarget("http://clients3.google.com/generate_204", 204, True, "Google 204"),
    ProbeTarget("http://captive.apple.com", 200, False, "Apple Captive"),
    ProbeTarget("http://msftconnecttest.com/connecttest.txt", 200, False, "Microsoft Network"),
]


class CaptivePortalDetector:
    """Service that repeatedly probes connectivity targets."""

    def __init__(self, timeout: float = 5.0, retries: int = 0) -> None:
        self.timeout = timeout
        self.retries = retries

    def probe_targets(self, targets: Iterable[ProbeTarget]) -> List[ProbeResult]:
        results: List[ProbeResult] = []
        for target in targets:
            attempt = 0
            while True:
                attempt += 1
                try:
                    start = time.monotonic()
                    request = Request(target.url, headers={"User-Agent": USER_AGENT})
                    with urlopen(request, timeout=self.timeout) as response:  # nosec: B310
                        status = response.getcode()
                        body = response.read(512)
                    elapsed = time.monotonic() - start
                    excerpt = body.decode("utf-8", "ignore")
                    result = ProbeResult(target, status, excerpt, elapsed)
                    results.append(result)
                    LOG.debug("%s responded with %s in %.2fs", target.url, status, elapsed)
                    break
                except URLError as exc:
                    elapsed = time.monotonic()
                    message = getattr(exc, "reason", str(exc))
                    result = ProbeResult(target, None, "", elapsed, error=str(message))
                    LOG.warning("Error probing %s: %s", target.url, message)
                    if attempt > self.retries:
                        results.append(result)
                        break
                    LOG.info("Retrying %s (%d/%d)", target.url, attempt, self.retries)
                    time.sleep(0.5)
        return results

    def is_captive_portal(self, results: Iterable[ProbeResult]) -> bool:
        return any(result.suspected_captive for result in results)

    def notify(self, title: str, message: str) -> None:
        """Send a desktop notification if possible."""

        notifier = shutil.which("notify-send")
        if notifier:
            try:
                subprocess.run([notifier, title, message], check=False)
                return
            except OSError as exc:  # pragma: no cover - best effort
                LOG.debug("Failed to send notification: %s", exc)
        LOG.info("%s: %s", title, message)

    def launch_sandboxed_browser(self, login_url: str) -> Optional[subprocess.Popen]:
        """Launch a WebKit browser in an isolated profile."""

        data_dir = tempfile.mkdtemp(prefix="captive-portal-")
        env = os.environ.copy()
        env.setdefault("WEBKIT_FORCE_SANDBOX", "1")
        candidates = [
            ["epiphany-browser", "--application-mode", f"--profile={data_dir}", login_url],
            ["flatpak", "run", "--filesystem=home:ro", "org.gnome.Epiphany", "--application-mode", f"--profile={data_dir}", login_url],
            ["webkit2gtk-driver", f"--urls={login_url}"]
        ]
        for command in candidates:
            executable = shutil.which(command[0])
            if not executable:
                continue
            try:
                LOG.info("Launching %s for captive portal login", command[0])
                process = subprocess.Popen(command, env=env)  # noqa: S603
                return process
            except OSError as exc:
                LOG.error("Failed to launch %s: %s", command[0], exc)
        self.notify(
            "Captive portal",
            "Could not launch a WebKit browser. Please open the portal URL manually."
        )
        return None

    def run(self) -> int:
        results = self.probe_targets(PROBE_TARGETS)
        captive = self.is_captive_portal(results)
        if not captive:
            self.notify("Network", "No captive portal detected. You are online.")
            return 0

        offending = ", ".join(
            f"{r.target.name or r.target.url} ({r.status or r.error})"
            for r in results if r.suspected_captive
        )
        message = f"Captive portal suspected: {offending}."
        self.notify("Captive portal", message)
        process = self.launch_sandboxed_browser("http://neverssl.com")
        if process is None:
            return 1

        try:
            while True:
                input("Press Enter to retry the captive portal check once you have signed in...")
                retry_results = self.probe_targets(PROBE_TARGETS)
                if not self.is_captive_portal(retry_results):
                    self.notify("Captive portal", "Login complete. Network access restored.")
                    process.terminate()
                    return 0
                self.notify("Captive portal", "Portal still active. Complete the login and retry.")
        except KeyboardInterrupt:
            self.notify("Captive portal", "Detection cancelled by user.")
            return 130


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s %(message)s")


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Captive portal detection service")
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP timeout per request in seconds")
    parser.add_argument("--retries", type=int, default=0, help="Retries for failed HTTP probes")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    configure_logging(args.verbose)
    detector = CaptivePortalDetector(timeout=args.timeout, retries=args.retries)
    return detector.run()


if __name__ == "__main__":
    sys.exit(main())
