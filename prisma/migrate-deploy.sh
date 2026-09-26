#!/bin/sh
# Applies pending migrations; used by the Docker `migrate` job.
#
# Databases deployed before this script were created with `prisma db push`
# and have no migration history, so `migrate deploy` refuses them (P3005).
# For those, every migration before BASELINE_BEFORE is marked as applied
# once (push already created that schema), then the rest runs normally.
set -eu
cd "$(dirname "$0")/.."

BASELINE_BEFORE="4_hardware_keys"

if output=$(npx prisma migrate deploy 2>&1); then
  echo "$output"
  exit 0
fi
echo "$output"
case "$output" in
  *P3005*) ;;
  *) exit 1 ;;
esac

echo "No migration history found, baselining migrations before $BASELINE_BEFORE"
for dir in prisma/migrations/*/; do
  name=$(basename "$dir")
  [ "$name" = "$BASELINE_BEFORE" ] && break
  npx prisma migrate resolve --applied "$name"
done
npx prisma migrate deploy
