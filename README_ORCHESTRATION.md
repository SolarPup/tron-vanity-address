Orchestration across multiple hosts

Quick guide to run a single vanity search across multiple servers and automatically stop all when a match is found.

Prerequisites
- Each host must have SSH access (passwordless key recommended) from the controller machine.
- The repository should be cloned on each host (default path: ~/tron-vanity-address). You can change the path by setting REPO_DIR environment variable when running the orchestrator.
- Node.js and npm must be installed on each host.

Hosts file
Create a file with one host per line (can be user@host):

hosts.txt
```
user@host1.example.com
user@host2.example.com
10.0.0.5
```

Run orchestrator

./scripts/orchestrate_search.sh hosts.txt --mode fixed-edges --similar-to TYAavN2xCDro5Gdip8UU6W9oQmM43rNxzQ --fixed-left 3 --fixed-right 3 --threads 8 --time-limit 86400 --save-file ./priv.enc --encrypt

Notes
- The script will `git pull` and `npm ci` on each host (best-effort), then start `node index.js` in background writing logs to `search.log` and PID to `search.pid` on the remote host.
- The orchestrator polls each host for the string `--- MATCH FOUND ---` in `search.log`. On match it fetches `search.log` and `priv.enc` (if present) and stops all hosts.
- By default the orchestrator will also poll remote logs every 5 seconds and aggregate basic **metrics** (Attempts and hashrate). You can control the polling interval with the `METRICS_INTERVAL` environment variable (seconds). Set `METRICS_INTERVAL=0` to disable metrics collection.

Example: to collect metrics every 10s

```
METRICS_INTERVAL=10 ./scripts/orchestrate_search.sh hosts.txt --mode fixed-edges --similar-to TYAavN2x... --fixed-left 3 --fixed-right 3 --threads 8 --time-limit 86400
```

Output to CSV

```
METRICS_FORMAT=csv METRICS_FILE=./metrics.csv METRICS_INTERVAL=10 ./scripts/orchestrate_search.sh hosts.txt --mode fixed-edges --similar-to TYAavN2x... --fixed-left 3 --fixed-right 3 --threads 8 --time-limit 86400
```

Output to JSON (one object per line)

```
METRICS_FORMAT=json METRICS_FILE=./metrics.json METRICS_INTERVAL=10 ./scripts/orchestrate_search.sh hosts.txt --mode fixed-edges --similar-to TYAavN2x... --fixed-left 3 --fixed-right 3 --threads 8 --time-limit 86400
```

Security
- Use SSH keys and limit access. If you plan to run this on cloud VMs, secure them properly (firewall, key rotation).

Customization
- You can change REPO_DIR by exporting `REPO_DIR` in your shell before running the script.
- To run the search on testnet, adjust your command to pass testNet to the workers (see code note below).

Code note
`index.js` now accepts a `--testnet` boolean flag which is propagated to workers via the `testNet` field in the worker message. Use `--testnet` to run searches that generate testnet addresses (prefix and checksum will follow testnet format).

Auto-clone and repo URL
The orchestrator can now automatically clone the repository on remote hosts if the configured `REPO_DIR` doesn't exist. Set the `REPO_URL` environment variable to point to the git URL you want to clone (default: `https://github.com/SolarPup/tron-vanity-address.git`). Example:

REPO_URL="https://github.com/aresastro/tron-vanity-address.git" ./scripts/orchestrate_search.sh hosts.txt --mode fixed-edges --similar-to TYAavN2x... --fixed-left 3 --fixed-right 3 --threads 8 --time-limit 86400
