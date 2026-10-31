#!/usr/bin/env bash
set -uo pipefail
build_log="$(mktemp)"
"$@" 2>&1 | tee "$build_log"
build_status=${PIPESTATUS[0]}
if [ "$build_status" -ne 0 ]; then
  python3 - "$build_log" <<'PY'
import pathlib, sys
tail = '\n'.join(pathlib.Path(sys.argv[1]).read_text(errors='replace').splitlines()[-100:])
tail = tail.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
print('::error title=Android build diagnostics::' + tail)
PY
fi
rm -f "$build_log"
exit "$build_status"
