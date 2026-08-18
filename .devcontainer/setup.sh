#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Installing frontend dependencies..."
cd "${repo_root}/apps/web"
npm ci

echo "Installing backend dependencies..."
cd "${repo_root}/apps/api"
if [[ ! -d .venv ]]; then
  python -m venv .venv
fi
.venv/bin/python -m pip install -r requirements-dev.txt

echo "Codespaces preview dependencies are ready."
