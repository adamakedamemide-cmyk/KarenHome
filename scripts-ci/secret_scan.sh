#!/bin/bash
# Secret scan before push — Karen Home governance (Gate 4.1 standing rule)
# Scans TRACKED files in a git working tree for credential patterns.
# Usage: secret_scan.sh <repo-path>
set -u
REPO="${1:-.}"
cd "$REPO" || exit 1

echo "=== SECRET SCAN $(date -u +%Y-%m-%dT%H:%M:%SZ) — $(git rev-parse --show-toplevel) ==="
VIOLATIONS=0

# Pattern list (label, extended-regex)
PATTERNS=(
  "github-token:ghp_[A-Za-z0-9]{30,}"
  "github-token-fine:github_pat_[A-Za-z0-9_]{20,}"
  "aws-key:AKIA[0-9A-Z]{16}"
  "private-key-block:-----BEGIN (RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----"
  "slack-token:xox[baprs]-[A-Za-z0-9-]{10,}"
  "google-api-key:AIza[0-9A-Za-z_-]{35}"
  "jwt-hardcoded-secret:JWT_SECRET\s*[:=]\s*['\"]?(?!replace-with|REDACTED|\$\{|your-|changeit|test)[A-Za-z0-9+/]{40,}"
  "db-url-cred:postgres(ql)?://[^/'\" ]*:[^@/'\" ]*@[a-zA-Z0-9._-]+"
  "twilio-key:SK[a-f0-9]{32}"
  "stripe-key:(sk|rk)_(live|test)_[A-Za-z0-9]{20,}"
  "sendgrid-key:SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}"
  "smtp-cred:smtp.*://[^/'\" ]*:[^@/'\" ]*@"
)

FILES=$(git ls-files)
for entry in "${PATTERNS[@]}"; do
  label="${entry%%:*}"; regex="${entry#*:}"
  hits=$(git grep -nIE "$regex" -- $FILES 2>/dev/null | grep -vE "REDACTED|\.env\.example|SENSITIVE_DATA_REDACTIONS|secret_scan|GATE4_1_.*REPORT|PHASE_Q|<YOUR-OWN-PASSWORD>|<user>|<password>|ci-placeholder-password" | head -20)
  if [ -n "$hits" ]; then
    echo "VIOLATION [$label]:"
    echo "$hits"
    VIOLATIONS=$((VIOLATIONS+1))
  fi
done

# Real .env files must not be tracked
envhits=$(echo "$FILES" | grep -E "(^|/)\.env$" || true)
if [ -n "$envhits" ]; then echo "VIOLATION [real-.env-tracked]: $envhits"; VIOLATIONS=$((VIOLATIONS+1)); fi

# docker-compose passwords (allow REDACTED only)
composehits=$(git grep -nE "POSTGRES_PASSWORD\s*:\s*(?!REDACTED)" -- $FILES 2>/dev/null | grep -v REDACTED | head -10 || true)
if [ -n "$composehits" ]; then echo "VIOLATION [compose-password]: $composehits"; VIOLATIONS=$((VIOLATIONS+1)); fi

echo "=== SECRET SCAN RESULT: $VIOLATIONS violation group(s) ==="
exit $VIOLATIONS
