#!/usr/bin/env bash
# Patch Anthropic provider after npm install/update.
# Strips eager_input_streaming (GitHub Copilot rejects it with 400).
set -euo pipefail

ANTHROPIC_JS="$(npm root -g)/little-coder/node_modules/@earendil-works/pi-ai/dist/providers/anthropic.js"
if [[ -f "$ANTHROPIC_JS" ]] && grep -q 'eager_input_streaming' "$ANTHROPIC_JS"; then
  python3 -c "
import pathlib
p = pathlib.Path('$ANTHROPIC_JS')
t = p.read_text()
p.write_text(t.replace('eager_input_streaming: true,', ''))
"
  echo "Patched: removed eager_input_streaming from $ANTHROPIC_JS"
else
  echo "OK: eager_input_streaming already absent (or file not found)"
fi
