#!/usr/bin/env bash
set -euo pipefail

UI_BASE_SHA="${1:-}"
if [ -z "$UI_BASE_SHA" ]; then
  echo "Usage: $0 <ui-baseline-commit-or-merge-sha>"; exit 1
fi

git checkout main && git pull
git checkout -b chore/restore-classic-ui-keep-apps

git restore --source="$UI_BASE_SHA" -- \
  components/ubuntu.tsx \
  components/base \
  components/screen \
  components/context-menus \
  components/util-components \
  styles \
  tailwind.config.js \
  public/images

# Keep apps and labels from main (includes About Alex via 311d8d1)
grep -n "About Alex" apps.config.js || {
  echo "About Alex missing in apps.config.js. Consider: git cherry-pick 311d8d107baaf556fba86ee1b9f1f14888dbae2c"
}

nvm use
yarn install
yarn lint || true
yarn build
