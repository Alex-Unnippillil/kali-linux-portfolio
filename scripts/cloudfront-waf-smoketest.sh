#!/usr/bin/env bash
# Simple smoke test for CloudFront WAF configuration.
# Sends a request with a basic XSS payload and prints the HTTP status.
# Optionally tails the configured CloudWatch log group.

set -euo pipefail

if [[ -z "${DISTRIBUTION_DOMAIN:-}" ]]; then
  echo "DISTRIBUTION_DOMAIN env var must be set (e.g. d123.cloudfront.net)"
  exit 1
fi

LOG_GROUP=${LOG_GROUP:-"/aws/cloudfront/portfolio-waf"}

# Send a synthetic malicious request
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${DISTRIBUTION_DOMAIN}/?test=<script>alert(1)</script>")

echo "WAF test HTTP status: ${STATUS}"

# Tail recent log entries if aws cli is configured
if command -v aws >/dev/null 2>&1; then
  echo "Recent log entries from ${LOG_GROUP}:"
  aws logs tail "${LOG_GROUP}" --since 5m 2>/dev/null | tail -n 20 || echo "No logs found"
else
  echo "aws cli not installed; skipping log tail"
fi
