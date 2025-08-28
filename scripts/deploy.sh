#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   npm run deploy
#
# Optional env vars:
#   FIREBASE_PROJECT=showbat3   # override project for deployment
#   FIREBASE_SITE=default       # override hosting site if needed
#   GCS_BUCKET=my-backups-bkt   # if set and gsutil exists, upload archive to GCS

STAMP="$(date -u +'%Y%m%d-%H%M%SZ')"
REV="$(git rev-parse --short HEAD 2>/dev/null || echo 'nogit')"
ARCHIVE_DIR="deploy-archives"
ARCHIVE_PREFIX="build-${STAMP}-${REV}"

mkdir -p "${ARCHIVE_DIR}"

echo "[deploy] Building React app..."
npm run build

echo "[deploy] Archiving build to ${ARCHIVE_DIR}/${ARCHIVE_PREFIX}.tgz"
tar -C build -czf "${ARCHIVE_DIR}/${ARCHIVE_PREFIX}.tgz" .

cat > "${ARCHIVE_DIR}/${ARCHIVE_PREFIX}.meta.json" <<META
{
  "timestamp": "${STAMP}",
  "git": "${REV}",
  "project_env": "${FIREBASE_PROJECT:-}",
  "site_env": "${FIREBASE_SITE:-}",
  "note": "Local archive of deployed Hosting files"
}
META

echo "[deploy] Deploying to Firebase Hosting..."
CMD=(firebase deploy --only hosting)
if [ -n "${FIREBASE_PROJECT:-}" ]; then CMD+=(--project "${FIREBASE_PROJECT}"); fi
if [ -n "${FIREBASE_SITE:-}" ]; then CMD+=(--site "${FIREBASE_SITE}"); fi
"${CMD[@]}"

# Optional: upload archives to GCS if configured and gsutil is available
if [ -n "${GCS_BUCKET:-}" ] && command -v gsutil >/dev/null 2>&1; then
  echo "[deploy] Uploading archive to gs://${GCS_BUCKET}/"
  gsutil cp "${ARCHIVE_DIR}/${ARCHIVE_PREFIX}.tgz" "gs://${GCS_BUCKET}/" || true
  gsutil cp "${ARCHIVE_DIR}/${ARCHIVE_PREFIX}.meta.json" "gs://${GCS_BUCKET}/" || true
fi

echo "[deploy] Done. Archives saved in ${ARCHIVE_DIR}/"

