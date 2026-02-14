#!/bin/bash

# LDS API Boltz PostgreSQL Debug Access Script
#
# Usage:
#   ./scripts/boltz-debug.sh                                    # Default query (swaps)
#   ./scripts/boltz-debug.sh "SELECT * FROM swaps LIMIT 10"     # Custom SQL query
#
# Environment:
#   Uses the central .env file. Required variables:
#   - DEBUG_ADDRESS: Wallet address with DEBUG role
#   - DEBUG_SIGNATURE: Signature from signing the LDS login message
#   - DEBUG_API_URL (optional): API URL, defaults to https://lightning.space/v1
#
# Requirements:
#   - curl
#   - jq (optional, for pretty output)

set -e

# --- Help ---
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "LDS API Boltz PostgreSQL Debug Access Script"
  echo ""
  echo "Usage:"
  echo "  ./scripts/boltz-debug.sh [SQL_QUERY]"
  echo ""
  echo "IMPORTANT: PostgreSQL is case-sensitive for table names!"
  echo "  - Use double quotes for camelCase tables: \"reverseSwaps\", \"chainSwaps\""
  echo "  - Lowercase tables work without quotes: swaps, pairs, referrals"
  echo ""
  echo "Examples:"
  echo "  ./scripts/boltz-debug.sh 'SELECT * FROM swaps LIMIT 10'"
  echo "  ./scripts/boltz-debug.sh 'SELECT * FROM \"reverseSwaps\" WHERE status = '\\''swap.created'\\'' LIMIT 10'"
  echo "  ./scripts/boltz-debug.sh 'SELECT * FROM \"chainSwaps\" LIMIT 10'"
  echo "  ./scripts/boltz-debug.sh 'SELECT * FROM pairs'"
  echo "  ./scripts/boltz-debug.sh 'SELECT id, pair, status, fee FROM \"chainSwaps\" ORDER BY id DESC LIMIT 20'"
  exit 0
fi

# --- Parse arguments ---
SQL="${1:-SELECT id, pair, status, \"createdAt\" FROM swaps ORDER BY \"createdAt\" DESC LIMIT 5}"

# --- Load environment ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file not found: $ENV_FILE"
  echo "Create .env in the api root directory with DEBUG_ADDRESS and DEBUG_SIGNATURE"
  exit 1
fi

# Read specific variables (avoid sourcing to prevent bash keyword conflicts)
DEBUG_ADDRESS=$(grep -E "^DEBUG_ADDRESS=" "$ENV_FILE" | cut -d'=' -f2-)
DEBUG_SIGNATURE=$(grep -E "^DEBUG_SIGNATURE=" "$ENV_FILE" | cut -d'=' -f2-)
DEBUG_API_URL=$(grep -E "^DEBUG_API_URL=" "$ENV_FILE" | cut -d'=' -f2-)

if [ -z "$DEBUG_ADDRESS" ] || [ -z "$DEBUG_SIGNATURE" ]; then
  echo "Error: DEBUG_ADDRESS and DEBUG_SIGNATURE must be set in .env"
  echo ""
  echo "To set up debug access:"
  echo "1. Get a wallet address with DEBUG role assigned"
  echo "2. Sign the message from GET /v1/auth/sign-message?address=YOUR_ADDRESS"
  echo "3. Add to .env:"
  echo "   DEBUG_ADDRESS=your_wallet_address"
  echo "   DEBUG_SIGNATURE=your_signature"
  exit 1
fi

API_URL="${DEBUG_API_URL:-https://lightning.space/v1}"

# --- Token Caching ---
TOKEN_CACHE="/tmp/lds-debug-token-$(echo "$DEBUG_ADDRESS" | md5sum | cut -c1-8).json"
TOKEN_MAX_AGE=3500  # ~58 minutes (JWT expires after 60 min)
TOKEN=""

# Check if cached token exists and is still valid
if [ -f "$TOKEN_CACHE" ]; then
  CACHE_MOD_TIME=$(stat -f %m "$TOKEN_CACHE" 2>/dev/null || stat -c %Y "$TOKEN_CACHE" 2>/dev/null)
  CURRENT_TIME=$(date +%s)
  CACHE_AGE=$((CURRENT_TIME - CACHE_MOD_TIME))

  if [ $CACHE_AGE -lt $TOKEN_MAX_AGE ]; then
    TOKEN=$(cat "$TOKEN_CACHE")
    ROLE=$(echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.role' 2>/dev/null || echo "unknown")
    echo "=== Using cached token (${CACHE_AGE}s old, role: $ROLE) ==="
  else
    echo "=== Token cache expired (${CACHE_AGE}s old), re-authenticating ==="
    rm -f "$TOKEN_CACHE"
  fi
fi

# Authenticate if no valid cached token
if [ -z "$TOKEN" ]; then
  echo "=== Authenticating to $API_URL ==="
  TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
    -H "Content-Type: application/json" \
    -d "{\"address\":\"$DEBUG_ADDRESS\",\"signature\":\"$DEBUG_SIGNATURE\"}")

  TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

  if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "Authentication failed:"
    echo "$TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$TOKEN_RESPONSE"
    exit 1
  fi

  # Cache the token
  echo "$TOKEN" > "$TOKEN_CACHE"
  chmod 600 "$TOKEN_CACHE"

  ROLE=$(echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.role' 2>/dev/null || echo "unknown")
  echo "Authenticated with role: $ROLE (token cached)"
fi
echo ""

# --- Execute query ---
echo "=== Executing Boltz PostgreSQL Query ==="
echo "Query: $SQL"
echo ""

# Escape JSON properly
SQL_ESCAPED=$(echo "$SQL" | sed 's/"/\\"/g')

RESULT=$(curl -s -X POST "$API_URL/support/debug/boltz" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sql\":\"$SQL_ESCAPED\"}")

echo "=== Result ==="

if command -v jq &> /dev/null; then
  # Check if result is valid JSON
  if ! echo "$RESULT" | jq -e . >/dev/null 2>&1; then
    echo "Error: Invalid JSON response"
    echo "$RESULT"
    exit 1
  fi

  # Check if it's an error response (object with message field, not an array)
  IS_ARRAY=$(echo "$RESULT" | jq -r 'if type == "array" then "yes" else "no" end' 2>/dev/null)

  if [ "$IS_ARRAY" = "no" ]; then
    ERROR=$(echo "$RESULT" | jq -r '.message // empty' 2>/dev/null)
    if [ -n "$ERROR" ]; then
      echo "Error: $ERROR"
      exit 1
    fi
  fi

  # Pretty print the result
  echo "$RESULT" | jq .
else
  echo "$RESULT"
fi
