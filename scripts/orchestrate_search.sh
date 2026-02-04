#!/usr/bin/env bash
# Orchestrate a fixed-edges search across multiple hosts via SSH
# Usage:
#   ./scripts/orchestrate_search.sh hosts.txt --similar-to <ADDR> [ --fixed-left 3 --fixed-right 3 --threads 8 --time-limit 86400 --save-file ./priv.enc --encrypt ]
# Hosts file: one hostname (or user@host) per line
# Requirements: passwordless SSH access, repo already cloned on each host at REPO_DIR

set -euo pipefail
IFS=$'\n\t'

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 hosts_file --similar-to <ADDR> [node index.js args...]"
  exit 1
fi

HOSTS_FILE="$1"; shift
REPO_DIR="${REPO_DIR:-$HOME/tron-vanity-address}"
REMOTE_LOG="search.log"
REMOTE_PID="search.pid"

# Pass-through CLI args for index.js
INDEX_ARGS="$@"

function start_on_host() {
  local host="$1"
  echo "[${host}] Starting search with: node index.js ${INDEX_ARGS}"
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$host" bash -lc "cd '$REPO_DIR' && git pull --quiet || true && npm ci --no-audit --no-fund --silent || true && nohup node index.js ${INDEX_ARGS} > $REMOTE_LOG 2>&1 & echo \$! > $REMOTE_PID"
}

function stop_on_host() {
  local host="$1"
  echo "[${host}] Stopping search"
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$host" bash -lc "if [ -f $REMOTE_PID ]; then kill \$(cat $REMOTE_PID) 2>/dev/null || true; rm -f $REMOTE_PID; fi;"
}

function check_match_on_host() {
  local host="$1"
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$host" bash -lc "if grep -q '\--- MATCH FOUND ---' $REMOTE_LOG 2>/dev/null; then echo MATCH; else echo NO; fi" || echo NO
}

function fetch_results() {
  local host="$1"
  local outdir="$2"
  mkdir -p "$outdir"
  echo "[${host}] Fetching logs and saved files to $outdir"
  scp -q "$host:$REPO_DIR/$REMOTE_LOG" "$outdir/${host//[:@]/_}-$REMOTE_LOG" || true
  scp -q "$host:$REPO_DIR/priv.enc" "$outdir/${host//[:@]/_}-priv.enc" || true
}

HOSTS=( $(grep -Ev '^\s*$|^#' "$HOSTS_FILE" ) )
if [ ${#HOSTS[@]} -eq 0 ]; then
  echo "No hosts found in $HOSTS_FILE"; exit 1
fi

# Start on all hosts
echo "Starting search on ${#HOSTS[@]} hosts..."
for h in "${HOSTS[@]}"; do
  start_on_host "$h" &
done
wait

# Monitor loop
echo "Monitoring hosts for match (Ctrl-C to abort)"
OUT_DIR="./remote_results-$(date +%Y%m%d-%H%M%S)"
while true; do
  for h in "${HOSTS[@]}"; do
    r=$(check_match_on_host "$h")
    if [ "$r" = "MATCH" ]; then
      echo "Match found on $h!"
      fetch_results "$h" "$OUT_DIR"
      # Stop all hosts
      for hh in "${HOSTS[@]}"; do
        stop_on_host "$hh" &
      done
      wait
      echo "All hosts stopped. Results saved to $OUT_DIR"
      # Show the matched log excerpt
      echo "--- Matched log excerpt ---"
      sed -n '1,200p' "$OUT_DIR/${h//[:@]/_}-$REMOTE_LOG" || true
      exit 0
    fi
  done
  sleep 5
done
