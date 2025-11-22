#!/bin/bash

# Skrypt testowy dla TODO API
# Użycie: ./test-api.sh

API_URL="http://localhost:3000"

echo "=========================================="
echo "🧪 TESTY API - TODO Manager"
echo "=========================================="
echo ""

# Kolory dla lepszej czytelności
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funkcja pomocnicza do wyświetlania wyników
print_test() {
    echo -e "${YELLOW}▶ Test: $1${NC}"
    echo "----------------------------------------"
}

print_success() {
    echo -e "${GREEN}✓ Sukces${NC}"
}

print_error() {
    echo -e "${RED}✗ Błąd${NC}"
}

# Test 1: GET /health
print_test "1. GET /health - Sprawdzenie statusu API"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/health")
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ]; then
    print_success
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
else
    print_error
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
fi
echo ""

# Test 2: GET /tasks (początkowo pusta lista)
print_test "2. GET /tasks - Pobranie wszystkich zadań (początkowo pusta lista)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/tasks")
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ]; then
    print_success
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
else
    print_error
    echo "Status: $http_code"
fi
echo ""

# Test 3: POST /tasks - Dodanie pierwszego zadania
print_test "3. POST /tasks - Dodanie nowego zadania #1"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Kupić mleko","description":"Mleko 3,2% - 2 litry"}')
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "201" ]; then
    print_success
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
    TASK1_ID=$(echo "$body" | grep -o '"id":[0-9]*' | cut -d: -f2)
    echo "ID utworzonego zadania: $TASK1_ID"
else
    print_error
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
fi
echo ""

# Test 4: POST /tasks - Dodanie drugiego zadania
print_test "4. POST /tasks - Dodanie nowego zadania #2"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Odrobić zadanie z backendu","description":"REST API dla TODO"}')
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "201" ]; then
    print_success
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
    TASK2_ID=$(echo "$body" | grep -o '"id":[0-9]*' | cut -d: -f2)
    echo "ID utworzonego zadania: $TASK2_ID"
else
    print_error
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
fi
echo ""

# Test 5: GET /tasks - Pobranie wszystkich zadań (po dodaniu)
print_test "5. GET /tasks - Pobranie wszystkich zadań (po dodaniu)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/tasks")
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ]; then
    print_success
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
    TASK_COUNT=$(echo "$body" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "Liczba zadań: $TASK_COUNT"
else
    print_error
    echo "Status: $http_code"
fi
echo ""

# Test 6: PUT /tasks/:id - Aktualizacja zadania (tylko completed)
print_test "6. PUT /tasks/1 - Aktualizacja zadania (oznaczenie jako zakończone)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_URL/tasks/1" \
  -H "Content-Type: application/json" \
  -d '{"completed":true}')
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ]; then
    print_success
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
else
    print_error
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
fi
echo ""

# Test 7: PUT /tasks/:id - Aktualizacja zadania (tytuł i opis)
print_test "7. PUT /tasks/1 - Aktualizacja zadania (tytuł i opis)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_URL/tasks/1" \
  -H "Content-Type: application/json" \
  -d '{"title":"Zaktualizowany tytuł","description":"Nowy opis zadania"}')
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ]; then
    print_success
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
else
    print_error
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
fi
echo ""

# Test 8: PUT /tasks/:id - Aktualizacja nieistniejącego zadania (404)
print_test "8. PUT /tasks/999 - Próba aktualizacji nieistniejącego zadania (404)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$API_URL/tasks/999" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nieistniejące zadanie"}')
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "404" ]; then
    print_success
    echo "Status: $http_code (oczekiwany błąd)"
    echo "Odpowiedź: $body"
else
    print_error
    echo "Status: $http_code (oczekiwano 404)"
    echo "Odpowiedź: $body"
fi
echo ""

# Test 9: POST /tasks - Walidacja (brak tytułu - 400)
print_test "9. POST /tasks - Walidacja (brak wymaganego pola 'title' - 400)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{"description":"Brak tytułu"}')
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "400" ]; then
    print_success
    echo "Status: $http_code (oczekiwany błąd walidacji)"
    echo "Odpowiedź: $body"
else
    print_error
    echo "Status: $http_code (oczekiwano 400)"
    echo "Odpowiedź: $body"
fi
echo ""

# Test 10: POST /tasks - Walidacja (pusty tytuł - 400)
print_test "10. POST /tasks - Walidacja (pusty tytuł - 400)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"","description":"Pusty tytuł"}')
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "400" ]; then
    print_success
    echo "Status: $http_code (oczekiwany błąd walidacji)"
    echo "Odpowiedź: $body"
else
    print_error
    echo "Status: $http_code (oczekiwano 400)"
    echo "Odpowiedź: $body"
fi
echo ""

# Test 11: GET /tasks - Finalne pobranie wszystkich zadań
print_test "11. GET /tasks - Finalne pobranie wszystkich zadań"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/tasks")
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "200" ]; then
    print_success
    echo "Status: $http_code"
    echo "Odpowiedź: $body"
    TASK_COUNT=$(echo "$body" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "Liczba zadań: $TASK_COUNT"
else
    print_error
    echo "Status: $http_code"
fi
echo ""

echo "=========================================="
echo "✅ Testy zakończone!"
echo "=========================================="

