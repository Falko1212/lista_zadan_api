#!/bin/bash

# Pełne testy API przez curl
# Użycie: NODE_ENV=test ./test-api-full.sh

API_URL="http://localhost:3000"
TEST_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

# Kolory
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_test() {
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "${CYAN}[Test $TEST_COUNT]${NC} ${YELLOW}$1${NC}"
    echo "----------------------------------------"
}

print_success() {
    PASSED_COUNT=$((PASSED_COUNT + 1))
    echo -e "${GREEN}✓ SUKCES${NC}"
}

print_error() {
    FAILED_COUNT=$((FAILED_COUNT + 1))
    echo -e "${RED}✗ BŁĄD${NC}"
}

test_endpoint() {
    local method=$1
    local url=$2
    local expected=$3
    local data=$4
    local desc=$5
    
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
        print_success
        echo "Status: $http_code (oczekiwano: $expected)"
        if [ -n "$body" ] && [ "$http_code" != "204" ]; then
            echo "Odpowiedź: $body" | head -c 200
            [ ${#body} -gt 200 ] && echo "..."
        fi
    else
        print_error
        echo "Status: $http_code (oczekiwano: $expected)"
        if [ -n "$body" ]; then
            echo "Odpowiedź: $body"
        fi
    fi
    echo ""
}

# Sprawdzenie serwera
print_header "🔍 SPRAWDZENIE POŁĄCZENIA"

if ! curl -s "$API_URL/health" > /dev/null; then
    echo -e "${RED}❌ Serwer nie odpowiada!${NC}"
    echo "Uruchom: cd backend && NODE_ENV=test npm start"
    exit 1
fi
echo -e "${GREEN}✓ Serwer działa${NC}"
echo ""

# ==========================================
# SEKCJA 1: PODSTAWOWE ENDPOINTY
# ==========================================
print_header "📋 SEKCJA 1: PODSTAWOWE ENDPOINTY"

test_endpoint "GET" "$API_URL/health" "200" "" "GET /health - Status API"
test_endpoint "GET" "$API_URL/tasks" "200" "" "GET /tasks - Pobranie wszystkich zadań"

# ==========================================
# SEKCJA 2: WALIDACJA - POST
# ==========================================
print_header "✅ SEKCJA 2: WALIDACJA DANYCH - POST"

test_endpoint "POST" "$API_URL/tasks" "400" '{"description":"Brak tytułu"}' "POST /tasks - Brak tytułu (400)"
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":""}' "POST /tasks - Pusty tytuł (400)"
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":"   "}' "POST /tasks - Tytuł tylko ze spacjami (400)"
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":123}' "POST /tasks - Tytuł jako liczba (400)"
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":"Test","description":123}' "POST /tasks - Opis jako liczba (400)"
test_endpoint "POST" "$API_URL/tasks" "400" '{}' "POST /tasks - Puste body (400)"

# ==========================================
# SEKCJA 3: DODAWANIE ZADAŃ
# ==========================================
print_header "➕ SEKCJA 3: DODAWANIE ZADAŃ"

test_endpoint "POST" "$API_URL/tasks" "201" '{"title":"Zadanie testowe 1","description":"Opis zadania 1"}' "POST /tasks - Dodanie zadania z tytułem i opisem"
test_endpoint "POST" "$API_URL/tasks" "201" '{"title":"Zadanie testowe 2"}' "POST /tasks - Dodanie zadania tylko z tytułem"
test_endpoint "POST" "$API_URL/tasks" "201" '{"title":"Zadanie z polskimi znakami ąęćłńóśźż","description":"Opis również z polskimi znakami"}' "POST /tasks - Zadanie z polskimi znakami"

# Pobierz ID ostatnio dodanych zadań
print_test "Pobieranie ID zadań do dalszych testów"
response=$(curl -s "$API_URL/tasks")
TASK_ID_1=$(echo "$response" | grep -o '"id":[0-9]*' | tail -2 | head -1 | cut -d: -f2)
TASK_ID_2=$(echo "$response" | grep -o '"id":[0-9]*' | tail -1 | cut -d: -f2)
echo "ID zadania 1: $TASK_ID_1"
echo "ID zadania 2: $TASK_ID_2"
echo ""

# ==========================================
# SEKCJA 4: POBIERANIE ZADAŃ
# ==========================================
print_header "📥 SEKCJA 4: POBIERANIE ZADAŃ"

test_endpoint "GET" "$API_URL/tasks" "200" "" "GET /tasks - Pobranie wszystkich zadań"

# Sprawdzenie struktury
print_test "GET /tasks - Sprawdzenie struktury zadania"
response=$(curl -s "$API_URL/tasks")
if echo "$response" | grep -q '"id"' && \
   echo "$response" | grep -q '"title"' && \
   echo "$response" | grep -q '"description"' && \
   echo "$response" | grep -q '"completed"' && \
   echo "$response" | grep -q '"createdAt"'; then
    print_success
    echo "Struktura zadania jest poprawna"
else
    print_error
    echo "Brakuje wymaganych pól"
fi
echo ""

# ==========================================
# SEKCJA 5: WALIDACJA - PUT
# ==========================================
print_header "✏️ SEKCJA 5: WALIDACJA DANYCH - PUT"

test_endpoint "PUT" "$API_URL/tasks/abc" "400" '{"title":"Test"}' "PUT /tasks/abc - Nieprawidłowe ID (400)"
test_endpoint "PUT" "$API_URL/tasks/1.5" "400" '{"title":"Test"}' "PUT /tasks/1.5 - ID jako float (400)"
test_endpoint "PUT" "$API_URL/tasks/-1" "400" '{"title":"Test"}' "PUT /tasks/-1 - ID ujemne (400)"
test_endpoint "PUT" "$API_URL/tasks/0" "400" '{"title":"Test"}' "PUT /tasks/0 - ID zerowe (400)"
test_endpoint "PUT" "$API_URL/tasks/99999" "404" '{"title":"Test"}' "PUT /tasks/99999 - Nieistniejące zadanie (404)"
test_endpoint "PUT" "$API_URL/tasks/$TASK_ID_1" "400" '{"title":""}' "PUT /tasks/$TASK_ID_1 - Pusty tytuł (400)"
test_endpoint "PUT" "$API_URL/tasks/$TASK_ID_1" "400" '{"completed":"true"}' "PUT /tasks/$TASK_ID_1 - Completed jako string (400)"

# ==========================================
# SEKCJA 6: AKTUALIZACJA ZADAŃ
# ==========================================
print_header "🔄 SEKCJA 6: AKTUALIZACJA ZADAŃ"

test_endpoint "PUT" "$API_URL/tasks/$TASK_ID_1" "200" '{"completed":true}' "PUT /tasks/$TASK_ID_1 - Oznaczenie jako zakończone"
test_endpoint "PUT" "$API_URL/tasks/$TASK_ID_1" "200" '{"title":"Zaktualizowany tytuł"}' "PUT /tasks/$TASK_ID_1 - Aktualizacja tytułu"
test_endpoint "PUT" "$API_URL/tasks/$TASK_ID_1" "200" '{"description":"Zaktualizowany opis"}' "PUT /tasks/$TASK_ID_1 - Aktualizacja opisu"
test_endpoint "PUT" "$API_URL/tasks/$TASK_ID_1" "200" '{"title":"Kompletna aktualizacja","description":"Nowy opis","completed":false}' "PUT /tasks/$TASK_ID_1 - Aktualizacja wszystkich pól"

# Sprawdzenie updatedAt
print_test "PUT /tasks/$TASK_ID_1 - Sprawdzenie pola updatedAt"
response=$(curl -s -X PUT "$API_URL/tasks/$TASK_ID_1" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test updatedAt"}')
if echo "$response" | grep -q '"updatedAt"'; then
    print_success
    echo "Pole updatedAt jest obecne"
else
    print_error
    echo "Brak pola updatedAt"
fi
echo ""

# ==========================================
# SEKCJA 7: USUWANIE ZADAŃ
# ==========================================
print_header "🗑️ SEKCJA 7: USUWANIE ZADAŃ"

test_endpoint "DELETE" "$API_URL/tasks/abc" "400" "" "DELETE /tasks/abc - Nieprawidłowe ID (400)"
test_endpoint "DELETE" "$API_URL/tasks/1.5" "400" "" "DELETE /tasks/1.5 - ID jako float (400)"
test_endpoint "DELETE" "$API_URL/tasks/-1" "400" "" "DELETE /tasks/-1 - ID ujemne (400)"
test_endpoint "DELETE" "$API_URL/tasks/99999" "404" "" "DELETE /tasks/99999 - Nieistniejące zadanie (404)"

# Usunięcie zadania
print_test "DELETE /tasks/$TASK_ID_2 - Usunięcie zadania (204)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE "$API_URL/tasks/$TASK_ID_2")
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
if [ "$http_code" = "204" ]; then
    print_success
    echo "Status: 204 No Content"
else
    print_error
    echo "Status: $http_code (oczekiwano: 204)"
fi
echo ""

# Sprawdzenie czy zadanie zostało usunięte
print_test "GET /tasks - Sprawdzenie czy zadanie zostało usunięte"
response=$(curl -s "$API_URL/tasks")
task_count=$(echo "$response" | grep -o '"id"' | wc -l | tr -d ' ')
if echo "$response" | grep -q "\"id\":$TASK_ID_2"; then
    print_error
    echo "Zadanie o ID $TASK_ID_2 nadal istnieje"
else
    print_success
    echo "Zadanie o ID $TASK_ID_2 zostało usunięte (pozostało zadań: $task_count)"
fi
echo ""

# ==========================================
# SEKCJA 8: EDGE CASES
# ==========================================
print_header "⚠️ SEKCJA 8: EDGE CASES"

test_endpoint "GET" "$API_URL/nonexistent" "404" "" "GET /nonexistent - Nieistniejący endpoint (404)"
test_endpoint "POST" "$API_URL/nonexistent" "404" '{"title":"Test"}' "POST /nonexistent - Nieistniejący endpoint (404)"
test_endpoint "PUT" "$API_URL/tasks/" "404" '{"title":"Test"}' "PUT /tasks/ - Brak ID (404)"
test_endpoint "DELETE" "$API_URL/tasks/" "404" "" "DELETE /tasks/ - Brak ID (404)"

# ==========================================
# SEKCJA 9: TRIMOWANIE BIAŁYCH ZNAKÓW
# ==========================================
print_header "✂️ SEKCJA 9: TRIMOWANIE BIAŁYCH ZNAKÓW"

print_test "POST /tasks - Trimowanie białych znaków"
response=$(curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -d '{"title":"   Tytuł z białymi znakami   ","description":"   Opis z białymi znakami   "}')
title=$(echo "$response" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
if [ "$title" = "Tytuł z białymi znakami" ]; then
    print_success
    echo "Białe znaki zostały usunięte z tytułu"
else
    print_error
    echo "Białe znaki nie zostały usunięte: '$title'"
fi
echo ""

# ==========================================
# SEKCJA 10: AUTOMATYCZNE GENEROWANIE ID
# ==========================================
print_header "🔢 SEKCJA 10: AUTOMATYCZNE GENEROWANIE ID"

print_test "POST /tasks - Sprawdzenie automatycznego generowania ID"
response1=$(curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -d '{"title":"Zadanie A"}')
id1=$(echo "$response1" | grep -o '"id":[0-9]*' | cut -d: -f2)

response2=$(curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -d '{"title":"Zadanie B"}')
id2=$(echo "$response2" | grep -o '"id":[0-9]*' | cut -d: -f2)

if [ -n "$id1" ] && [ -n "$id2" ] && [ "$id2" -gt "$id1" ]; then
    print_success
    echo "ID są generowane sekwencyjnie (ID1: $id1, ID2: $id2)"
else
    print_error
    echo "ID nie są generowane poprawnie (ID1: $id1, ID2: $id2)"
fi
echo ""

# ==========================================
# PODSUMOWANIE
# ==========================================
print_header "📈 PODSUMOWANIE TESTÓW"

echo -e "${CYAN}Wykonano testów:${NC} $TEST_COUNT"
echo -e "${GREEN}Przeszło:${NC} $PASSED_COUNT"
echo -e "${RED}Nie przeszło:${NC} $FAILED_COUNT"

if [ $FAILED_COUNT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Wszystkie testy przeszły pomyślnie!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Niektóre testy nie przeszły${NC}"
    exit 1
fi

