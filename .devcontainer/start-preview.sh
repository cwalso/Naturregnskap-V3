#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backend_pid=""
frontend_pid=""

cleanup() {
  trap - EXIT INT TERM
  [[ -n "${backend_pid}" ]] && kill "${backend_pid}" 2>/dev/null || true
  [[ -n "${frontend_pid}" ]] && kill "${frontend_pid}" 2>/dev/null || true
  [[ -n "${backend_pid}" ]] && wait "${backend_pid}" 2>/dev/null || true
  [[ -n "${frontend_pid}" ]] && wait "${frontend_pid}" 2>/dev/null || true
}

stop_on_signal() {
  echo
  echo "Stopping Naturregnskap V3 preview..."
  cleanup
  exit 130
}

trap cleanup EXIT
trap stop_on_signal INT TERM

echo "Starting Naturregnskap V3 API on http://0.0.0.0:8000 ..."
(
  cd "${repo_root}/apps/api"
  exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
) &
backend_pid=$!

echo "Starting Naturregnskap V3 frontend on http://0.0.0.0:5173 ..."
echo "Frontend requests under /api are proxied to the API on port 8000."
(
  cd "${repo_root}/apps/web"
  exec npm run dev -- --host 0.0.0.0 --port 5173
) &
frontend_pid=$!

set +e
wait -n "${backend_pid}" "${frontend_pid}"
status=$?
set -e

echo "A preview process stopped (exit status ${status}); stopping the other process."
exit "${status}"
