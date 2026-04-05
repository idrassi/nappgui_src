#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN=python
else
  echo "Error: python3 or python is required to build the docs search index." >&2
  exit 1
fi

"$PYTHON_BIN" "$SCRIPT_DIR/build-search-index.py" "$@"
