#!/bin/bash
# Watchdog script that keeps the server running
while true; do
  # Check if server is running
  if ! pgrep -f "serve_aisolar" > /dev/null; then
    echo "[$(date)] Server not running, starting..." >> /home/z/my-project/aisolar/logs/watchdog.log
    cd /home/z/my-project/aisolar
    python3 /home/z/my-project/scripts/serve_aisolar.py >> /home/z/my-project/aisolar/logs/serve.log 2>&1 &
    echo "[$(date)] Started PID: $!" >> /home/z/my-project/aisolar/logs/watchdog.log
    sleep 2
  fi
  sleep 5
done
