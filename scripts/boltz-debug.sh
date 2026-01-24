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
  echo "Examples:"
  echo "  ./scripts/boltz-debug.sh \"SELECT * FROM swaps LIMIT 10\""
  echo "  ./scripts/boltz-debug.sh \"SELECT * FROM reverseswaps WHERE status = 'swap.created' LIMIT 10\""
  echo "  ./scripts/boltz-debug.sh \"SELECT * FROM chainswaps LIMIT 10\""
  echo "  ./scripts/boltz-debug.sh \"SELECT * FROM pairs\""
  echo "  ./scripts/boltz-debug.sh \"SELECT id, pair, status, fee FROM chainswaps ORDER BY id DESC LIMIT 20\""
  exit 0
fi

# --- Parse arguments ---
SQL="${1:-SELECT id, pair, status, \"createdAt\" FROM swaps ORDER BY id DESC LIMIT 5}"

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

# --- Authenticate ---
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

ROLE=$(echo "$TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.role' 2>/dev/null || echo "unknown")
echo "Authenticated with role: $ROLE"
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
  # Check if it's an error
  ERROR=$(echo "$RESULT" | jq -r '.message // empty' 2>/dev/null)
  if [ -n "$ERROR" ]; then
    echo "Error: $ERROR"
    exit 1
  fi

  echo "$RESULT" | jq .
else
  echo "$RESULT"
fi
