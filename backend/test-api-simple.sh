#!/bin/bash

# Proste testy API przez curl
# Użycie: ./test-api-simple.sh

API_URL="http://localhost:3000"

echo "=========================================="
echo "🧪 PROSTE TESTY API - TODO Manager"
echo "=========================================="
echo ""

# Kolory
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Funkcja pomocnicza
test_endpoint() {
    local method=$1
    local url=$2
    local expected=$3
    local data=$4
    local desc=$5
    
    echo -e "${YELLOW}Test: $desc${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "$expected" ]; then
        echo -e "${GREEN}✓ SUKCES${NC} - Status: $http_code"
        if [ -n "$body" ] && [ "$http_code" != "204" ]; then
            echo "Odpowiedź: $body" | head -c 150
            [ ${#body} -gt 150 ] && echo "..."
        fi
    else
        echo -e "${RED}✗ BŁĄD${NC} - Status: $http_code (oczekiwano: $expected)"
        if [ -n "$body" ]; then
            echo "Odpowiedź: $body"
        fi
    fi
    echo ""
}

# Sprawdzenie czy serwer działa
echo "Sprawdzanie połączenia z serwerem..."
if ! curl -s "$API_URL/health" > /dev/null; then
    echo -e "${RED}❌ Serwer nie odpowiada!${NC}"
    echo "Uruchom serwer: cd backend && npm start"
    exit 1
fi
echo -e "${GREEN}✓ Serwer działa${NC}"
echo ""

# ==========================================
# TESTY
# ==========================================

# 1. GET /health
test_endpoint "GET" "$API_URL/health" "200" "" "GET /health - Sprawdzenie statusu API"

# 2. GET /tasks
test_endpoint "GET" "$API_URL/tasks" "200" "" "GET /tasks - Pobranie wszystkich zadań"

# 3. POST /tasks - Dodanie zadania
test_endpoint "POST" "$API_URL/tasks" "201" \
    '{"title":"Test zadanie 1","description":"To jest pierwsze testowe zadanie"}' \
    "POST /tasks - Dodanie zadania"

# 4. POST /tasks - Dodanie drugiego zadania
test_endpoint "POST" "$API_URL/tasks" "201" \
    '{"title":"Test zadanie 2","description":"To jest drugie testowe zadanie"}' \
    "POST /tasks - Dodanie drugiego zadania"

# 5. GET /tasks - Sprawdzenie dodanych zadań
test_endpoint "GET" "$API_URL/tasks" "200" "" "GET /tasks - Sprawdzenie dodanych zadań"

# 6. PUT /tasks/1 - Aktualizacja zadania
test_endpoint "PUT" "$API_URL/tasks/1" "200" \
    '{"completed":true}' \
    "PUT /tasks/1 - Oznaczenie zadania jako zakończone"

# 7. PUT /tasks/1 - Aktualizacja tytułu
test_endpoint "PUT" "$API_URL/tasks/1" "200" \
    '{"title":"Zaktualizowany tytuł"}' \
    "PUT /tasks/1 - Aktualizacja tytułu"

# 8. GET /tasks - Sprawdzenie zaktualizowanych zadań
test_endpoint "GET" "$API_URL/tasks" "200" "" "GET /tasks - Sprawdzenie zaktualizowanych zadań"

# 9. DELETE /tasks/2 - Usunięcie zadania
test_endpoint "DELETE" "$API_URL/tasks/2" "204" "" "DELETE /tasks/2 - Usunięcie zadania"

# 10. GET /tasks - Sprawdzenie po usunięciu
test_endpoint "GET" "$API_URL/tasks" "200" "" "GET /tasks - Sprawdzenie po usunięciu"

# 11. POST /tasks - Walidacja (brak tytułu)
test_endpoint "POST" "$API_URL/tasks" "400" \
    '{"description":"Brak tytułu"}' \
    "POST /tasks - Walidacja (brak tytułu - 400)"

# 12. PUT /tasks/999 - Nieistniejące zadanie
test_endpoint "PUT" "$API_URL/tasks/999" "404" \
    '{"title":"Test"}' \
    "PUT /tasks/999 - Nieistniejące zadanie (404)"

# 13. DELETE /tasks/999 - Nieistniejące zadanie
test_endpoint "DELETE" "$API_URL/tasks/999" "404" "" "DELETE /tasks/999 - Nieistniejące zadanie (404)"

# 14. GET /nonexistent - Nieistniejący endpoint
test_endpoint "GET" "$API_URL/nonexistent" "404" "" "GET /nonexistent - Nieistniejący endpoint (404)"

echo "=========================================="
echo "✅ Testy zakończone!"
echo "=========================================="

