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
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$host" bash -lc "if [ ! -d '$REPO_DIR' ]; then \
      if [ -n \"${REPO_URL}\" ]; then git clone \"${REPO_URL}\" '$REPO_DIR'; \
      else git clone 'https://github.com/SolarPup/tron-vanity-address.git' '$REPO_DIR'; fi; \
    fi && cd '$REPO_DIR' && git pull --quiet || true && npm ci --no-audit --no-fund --silent || true && nohup node index.js ${INDEX_ARGS} > $REMOTE_LOG 2>&1 & echo \$! > $REMOTE_PID"
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
METRICS_INTERVAL=${METRICS_INTERVAL:-5} # seconds; set to 0 to disable
METRICS_FORMAT=${METRICS_FORMAT:-} # 'csv' or 'json' to enable file output
METRICS_FILE=${METRICS_FILE:-"./metrics.out"}

function parse_hashrate() {
  # input example: '1.63k/s' or '500/s'
  local s="$1"
  s=${s%/s}
  s=$(echo "$s" | tr '[:upper:]' '[:lower:]')
  if [[ "$s" =~ ^([0-9]+\.?[0-9]*)k$ ]]; then awk "BEGIN{print ${BASH_REMATCH[1]}*1000}"; return; fi
  if [[ "$s" =~ ^([0-9]+\.?[0-9]*)m$ ]]; then awk "BEGIN{print ${BASH_REMATCH[1]}*1000000}"; return; fi
  if [[ "$s" =~ ^([0-9]+\.?[0-9]*)g$ ]]; then awk "BEGIN{print ${BASH_REMATCH[1]}*1000000000}"; return; fi
  if [[ "$s" =~ ^([0-9]+\.?[0-9]*)$ ]]; then echo "$s"; return; fi
  echo 0
}

function get_host_progress() {
  local host="$1"
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$host" bash -lc "if [ -f '$REPO_DIR/$REMOTE_LOG' ]; then tail -n 200 '$REPO_DIR/$REMOTE_LOG' | grep 'Attempts:' | tail -n1 || true; else echo ''; fi" || echo ""
}

function human_hr() {
  local n=$1
  echo "$n" | awk '{if($1>=1e9){printf "%.2fG/s",$1/1e9}else if($1>=1e6){printf "%.2fM/s",$1/1e6}else if($1>=1e3){printf "%.2fk/s",$1/1e3}else{printf "%d/s",$1}}'
}

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

  # Collect metrics (if enabled)
  if [ "$METRICS_INTERVAL" -ne 0 ]; then
    total_attempts=0
    total_hashrate=0
    lines=()
    for h in "${HOSTS[@]}"; do
      line=$(get_host_progress "$h")
      if [ -z "$line" ]; then
        lines+=("[$h] n/a")
        continue
      fi
      attempts=$(echo "$line" | sed -n 's/.*Attempts: \([0-9,]*\).*/\1/p' | tr -d ',')
      hr=$(echo "$line" | sed -n 's/.*hashrate: \([^|]*\).*/\1/p' | tr -d ' ')
      attempts=${attempts:-0}
      hr=${hr:-0/s}
      hrnum=$(parse_hashrate "$hr")
      total_attempts=$((total_attempts + attempts))
      total_hashrate=$(awk "BEGIN{print $total_hashrate + $hrnum}")
      lines+=("[$h] Attempts:$attempts hashrate:$hr")
    done

    echo "---- Metrics (aggregated) ----"
    for l in "${lines[@]}"; do echo "$l"; done
    echo "Total attempts: $total_attempts | Total hashrate: $(human_hr $total_hashrate)"

    # Optional file output in CSV or JSON
    if [ -n "$METRICS_FORMAT" ]; then
      ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      if [ "$METRICS_FORMAT" = "json" ]; then
        # Build JSON array of hosts
        hosts_json="["
        first=1
        for h in "${HOSTS[@]}"; do
          line=$(get_host_progress "$h")
          attempts=$(echo "$line" | sed -n 's/.*Attempts: \([0-9,]*\).*/\1/p' | tr -d ',')
          hr=$(echo "$line" | sed -n 's/.*hashrate: \([^|]*\).*/\1/p' | tr -d ' ')
          attempts=${attempts:-0}
          hr=${hr:-"0/s"}
          [ $first -eq 0 ] && hosts_json="${hosts_json},"
          first=0
          hosts_json="${hosts_json}{\"host\":\"${h}\",\"attempts\":${attempts},\"hashrate\":\"${hr}\"}"
        done
        hosts_json="${hosts_json}]"
        echo "{\"timestamp\":\"${ts}\",\"hosts\":${hosts_json},\"total_attempts\":${total_attempts},\"total_hashrate\":\"$(human_hr $total_hashrate)\"}" >> "$METRICS_FILE"
      elif [ "$METRICS_FORMAT" = "csv" ]; then
        # CSV header: timestamp,host,attempts,hashrate
        if [ ! -f "$METRICS_FILE" ]; then
          echo "timestamp,host,attempts,hashrate" > "$METRICS_FILE"
        fi
        for h in "${HOSTS[@]}"; do
          line=$(get_host_progress "$h")
          attempts=$(echo "$line" | sed -n 's/.*Attempts: \([0-9,]*\).*/\1/p' | tr -d ',')
          hr=$(echo "$line" | sed -n 's/.*hashrate: \([^|]*\).*/\1/p' | tr -d ' ')
          attempts=${attempts:-0}
          hr=${hr:-"0/s"}
          echo "${ts},${h},${attempts},\"${hr}\"" >> "$METRICS_FILE"
        done
        # Optional summary line
        echo "${ts},TOTAL,${total_attempts},\"$(human_hr $total_hashrate)\"" >> "$METRICS_FILE"
      fi
    fi
  fi

  sleep $METRICS_INTERVAL
done
