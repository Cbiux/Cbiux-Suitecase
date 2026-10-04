#!/usr/bin/env bash
# Vercel ignoreCommand: exit 0 skips the build, exit 1 builds.
# Catalog backups live on their own branch and must not redeploy the site.
if [ "${VERCEL_GIT_COMMIT_REF:-}" = "${CATALOG_GITHUB_BRANCH:-catalog}" ]; then
  exit 0
fi
exit 1
