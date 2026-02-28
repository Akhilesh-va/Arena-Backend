#!/bin/bash
# Quick API tests for Arena backend (server must be running on port 3000)
BASE="http://localhost:3000/api/v1"

echo "=== 1. Health ==="
curl -s "http://localhost:3000/health" | head -1
echo ""

echo "=== 2. Register ==="
REG=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@arena.com","password":"password123","displayName":"Test User"}')
echo "$REG" | head -c 200
echo "..."

# Extract token (requires jq; otherwise skip)
if command -v jq &>/dev/null; then
  TOKEN=$(echo "$REG" | jq -r '.accessToken')
  echo ""
  echo "=== 3. Get me (with token) ==="
  curl -s "$BASE/users/me" -H "Authorization: Bearer $TOKEN" | head -c 200
  echo ""
  echo "=== 4. Create post ==="
  curl -s -X POST "$BASE/posts" -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type":"text","caption":"Hello from API test!"}' | head -c 200
  echo ""
  echo "=== 5. Get feed ==="
  curl -s "$BASE/feed" -H "Authorization: Bearer $TOKEN" | head -c 300
  echo ""
else
  echo ""
  echo "Install jq for token extraction, or use Postman/curl manually."
fi

echo ""
echo "Done."
