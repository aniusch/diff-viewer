#!/usr/bin/env bash
set -euo pipefail

EXT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${EXT_DIR}"
rm -f ./*.vsix

npx --yes @vscode/vsce package 
VSIX="$(ls -1 ./*.vsix | head -n 1)"

if command -v cursor >/dev/null 2>&1; then
  CLI=cursor
elif command -v code >/dev/null 2>&1; then
  CLI=code
else
  echo "Neither cursor nor code CLI found. Install by hand: ${EXT_DIR}/${VSIX}" >&2
  exit 1
fi

"${CLI}" --uninstall-extension facepass.helm-diff-viewer >/dev/null 2>&1 || true
"${CLI}" --uninstall-extension schuina.diff-viewer >/dev/null 2>&1 || true
"${CLI}" --uninstall-extension schuina.driftglass >/dev/null 2>&1 || true

"${CLI}" --install-extension "${VSIX}" --force

echo ""
echo "Installed Driftglass (${VSIX})"
echo "Reload the window: Ctrl+Shift+P → Developer: Reload Window"
echo "Opens for *.diff, *.patch, *.rej, *.helmdiff"
echo "Settings: driftglass.showToc, driftglass.helmResourceHeaders"
