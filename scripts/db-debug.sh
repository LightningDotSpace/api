#!/bin/bash

# LDS API Debug Database Access Script
#
# Usage:
#   ./scripts/db-debug.sh                                    # Default query (wallets)
#   ./scripts/db-debug.sh "SELECT TOP 10 id FROM wallet"     # Custom SQL query
#
# Environment:
#   Uses the central .env file. Required variables:
#   - DEBUG_ADDRESS: Wallet address with DEBUG role
#   - DEBUG_SIGNATURE: Signature from signing the LDS login message
#   - DEBUG_API_URL (optional): API URL, defaults to https://api.lightning.space/v1
#
# Requirements:
#   - curl
#   - jq (optional, for pretty output)

set -e

# --- Help ---
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  echo "LDS API Debug Database Access Script"
  echo ""
  echo "Usage:"
  echo "  ./scripts/db-debug.sh [SQL_QUERY]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/db-debug.sh \"SELECT TOP 10 * FROM wallet\""
  echo "  ./scripts/db-debug.sh \"SELECT TOP 10 * FROM user_transaction ORDER BY id DESC\""
  echo "  ./scripts/db-debug.sh \"SELECT TOP 10 * FROM lightning_wallet\""
  exit 0
fi

# --- Parse arguments ---
SQL="${1:-SELECT TOP 5 id, address, role FROM wallet ORDER BY id DESC}"

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

API_URL="${DEBUG_API_URL:-https://api.lightning.space/v1}"

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
echo "=== Executing SQL Query ==="
echo "Query: $SQL"
echo ""

RESULT=$(curl -s -X POST "$API_URL/support/debug" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sql\":\"$SQL\"}")

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
