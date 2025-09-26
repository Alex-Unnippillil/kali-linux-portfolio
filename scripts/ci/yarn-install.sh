#!/usr/bin/env bash
set -euo pipefail

TMP_LOG="$(mktemp)"
trap 'rm -f "$TMP_LOG"' EXIT

if yarn install --immutable --immutable-cache --inline-builds | tee "$TMP_LOG"; then
  :
else
  status=$?
  exit "$status"
fi

if grep -q "Done with warnings" "$TMP_LOG"; then
  echo "::error::Yarn install completed with warnings"
  exit 1
fi
