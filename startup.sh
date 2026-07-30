#!/bin/sh
set -eu
cd /workspace
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
export CHOKIDAR_USEPOLLING=1
npm run dev >>/tmp/app-startup.log 2>&1 &
# wait briefly for port
i=0
while [ "$i" -lt 30 ]; do
  if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
    exit 0
  fi
  i=$((i+1))
  sleep 0.5
done
exit 0
