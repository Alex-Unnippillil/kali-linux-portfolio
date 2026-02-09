#!/usr/bin/env bash

set -euo pipefail

if [ "${VERCEL_GIT_COMMIT_REF:-}" = "gh-pages" ]; then
  echo "Skipping build for gh-pages branch."
  exit 0
fi

echo "Allowing Vercel build for ${VERCEL_GIT_COMMIT_REF:-unknown} branch."
exit 1
