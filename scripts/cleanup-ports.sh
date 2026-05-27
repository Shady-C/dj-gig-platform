#!/usr/bin/env bash
set -euo pipefail

DEFAULT_PORTS="4000 5173 5174"
DRY_RUN=false
PORTS=()

usage() {
  cat <<'EOF'
Usage: bash scripts/cleanup-ports.sh [--dry-run] [port ...]

Stops processes listening on the DJ Gig Platform local dev ports.
Defaults to: 4000 5173 5174
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      PORTS+=("$1")
      shift
      ;;
  esac
done

if [[ ${#PORTS[@]} -eq 0 ]]; then
  # shellcheck disable=SC2206
  PORTS=($DEFAULT_PORTS)
fi

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof is required to find local port listeners." >&2
  exit 1
fi

found_any=false

for port in "${PORTS[@]}"; do
  if ! [[ "$port" =~ ^[0-9]+$ ]]; then
    echo "Skipping invalid port: $port" >&2
    continue
  fi

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u || true)"

  if [[ -z "$pids" ]]; then
    echo "Port $port: no listener"
    continue
  fi

  found_any=true

  if [[ "$DRY_RUN" == true ]]; then
    echo "Port $port: would stop PID(s) ${pids//$'\n'/, }"
  else
    echo "Port $port: stopping PID(s) ${pids//$'\n'/, }"
    kill $pids
  fi
done

if [[ "$found_any" == false ]]; then
  echo "No local dev port listeners found."
elif [[ "$DRY_RUN" == false ]]; then
  echo "Local dev ports cleaned up."
fi
