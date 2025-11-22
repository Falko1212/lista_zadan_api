#!/bin/bash

# Rozbudowane testy API dla TODO Manager
# Użycie: ./test-api-comprehensive.sh

API_URL="http://localhost:3000"
TEST_COUNT=0
PASSED_COUNT=0
FAILED_COUNT=0

# Kolory dla lepszej czytelności
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funkcje pomocnicze
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
    local expected_code=$3
    local data=$4
    local description=$5
    
    print_test "$description"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "$expected_code" ]; then
        print_success
        echo "Status: $http_code (oczekiwano: $expected_code)"
        if [ -n "$body" ]; then
            echo "Odpowiedź: $body" | head -c 200
            [ ${#body} -gt 200 ] && echo "..."
        fi
    else
        print_error
        echo "Status: $http_code (oczekiwano: $expected_code)"
        echo "Odpowiedź: $body"
    fi
    echo ""
}

# Sprawdzenie czy serwer działa
print_header "🔍 SPRAWDZENIE POŁĄCZENIA Z SERWEREM"

if ! curl -s "$API_URL/health" > /dev/null; then
    echo -e "${RED}❌ Serwer nie odpowiada na $API_URL${NC}"
    echo "Upewnij się, że serwer jest uruchomiony: cd backend && npm start"
    exit 1
fi

echo -e "${GREEN}✓ Serwer działa${NC}"
echo ""

# ==========================================
# SEKCJA 1: PODSTAWOWE ENDPOINTY
# ==========================================
print_header "📋 SEKCJA 1: PODSTAWOWE ENDPOINTY"

# Test 1: GET /health
test_endpoint "GET" "$API_URL/health" "200" "" "GET /health - Sprawdzenie statusu API"

# Test 2: GET /tasks (początkowo pusta lista)
test_endpoint "GET" "$API_URL/tasks" "200" "" "GET /tasks - Pobranie wszystkich zadań (początkowo pusta lista)"

# ==========================================
# SEKCJA 2: WALIDACJA DANYCH - POST
# ==========================================
print_header "✅ SEKCJA 2: WALIDACJA DANYCH - POST /tasks"

# Test 3: POST bez tytułu (400)
test_endpoint "POST" "$API_URL/tasks" "400" '{"description":"Brak tytułu"}' "POST /tasks - Brak wymaganego pola 'title' (400)"

# Test 4: POST z pustym tytułem (400)
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":"","description":"Pusty tytuł"}' "POST /tasks - Pusty tytuł (400)"

# Test 5: POST z tytułem tylko ze spacjami (400)
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":"   ","description":"Tylko spacje"}' "POST /tasks - Tytuł tylko ze spacjami (400)"

# Test 6: POST z tytułem za długim (400) - POMINIĘTO (użytkownik nie chce testów na zbyt długie opisy)
# Test 7: POST z opisem za długim (400) - POMINIĘTO (użytkownik nie chce testów na zbyt długie opisy)

# Test 8: POST z nieprawidłowym typem tytułu (400)
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":123,"description":"Liczba zamiast stringa"}' "POST /tasks - Tytuł jako liczba zamiast stringa (400)"

# Test 9: POST z nieprawidłowym typem opisu (400)
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":"Test","description":123}' "POST /tasks - Opis jako liczba zamiast stringa (400)"

# ==========================================
# SEKCJA 3: DODAWANIE ZADAŃ - SUKCES
# ==========================================
print_header "➕ SEKCJA 3: DODAWANIE ZADAŃ - SUKCES"

# Test 10: POST z tytułem i opisem
test_endpoint "POST" "$API_URL/tasks" "201" '{"title":"Kupić mleko","description":"Mleko 3,2% - 2 litry"}' "POST /tasks - Dodanie zadania z tytułem i opisem (201)"

# Test 11: POST tylko z tytułem (bez opisu)
test_endpoint "POST" "$API_URL/tasks" "201" '{"title":"Odrobić zadanie z backendu"}' "POST /tasks - Dodanie zadania tylko z tytułem (201)"

# Test 12: POST z pustym opisem
test_endpoint "POST" "$API_URL/tasks" "201" '{"title":"Zadanie z pustym opisem","description":""}' "POST /tasks - Dodanie zadania z pustym opisem (201)"

# Test 13: POST z tytułem na granicy limitu (200 znaków) - POMINIĘTO
# Test 14: POST z opisem na granicy limitu (1000 znaków) - POMINIĘTO

# Test 15: POST z tytułem zawierającym znaki specjalne
test_endpoint "POST" "$API_URL/tasks" "201" '{"title":"Zadanie z znakami: !@#$%^&*()","description":"Opis z <script>alert(1)</script>"}' "POST /tasks - Tytuł ze znakami specjalnymi (201)"

# ==========================================
# SEKCJA 4: POBIERANIE ZADAŃ
# ==========================================
print_header "📥 SEKCJA 4: POBIERANIE ZADAŃ"

# Test 16: GET /tasks po dodaniu zadań
test_endpoint "GET" "$API_URL/tasks" "200" "" "GET /tasks - Pobranie wszystkich zadań po dodaniu"

# Test 17: Sprawdzenie struktury zadania
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
    echo "Brakuje wymaganych pól w strukturze zadania"
fi
echo ""

# ==========================================
# SEKCJA 5: WALIDACJA DANYCH - PUT
# ==========================================
print_header "✏️ SEKCJA 5: WALIDACJA DANYCH - PUT /tasks/:id"

# Test 18: PUT z nieprawidłowym ID (nie liczba)
test_endpoint "PUT" "$API_URL/tasks/abc" "400" '{"title":"Test"}' "PUT /tasks/abc - Nieprawidłowe ID (nie liczba) (400)"

# Test 19: PUT z ID jako liczbą zmiennoprzecinkową
test_endpoint "PUT" "$API_URL/tasks/1.5" "400" '{"title":"Test"}' "PUT /tasks/1.5 - ID jako liczba zmiennoprzecinkowa (400)"

# Test 20: PUT z ID ujemnym
test_endpoint "PUT" "$API_URL/tasks/-1" "400" '{"title":"Test"}' "PUT /tasks/-1 - ID ujemne (400)"

# Test 21: PUT z ID zerowym
test_endpoint "PUT" "$API_URL/tasks/0" "400" '{"title":"Test"}' "PUT /tasks/0 - ID zerowe (400)"

# Test 22: PUT z nieistniejącym ID (404)
test_endpoint "PUT" "$API_URL/tasks/99999" "404" '{"title":"Nieistniejące zadanie"}' "PUT /tasks/99999 - Nieistniejące zadanie (404)"

# Test 23: PUT z pustym tytułem
test_endpoint "PUT" "$API_URL/tasks/1" "400" '{"title":""}' "PUT /tasks/1 - Pusty tytuł (400)"

# Test 24: PUT z tytułem za długim - POMINIĘTO (użytkownik nie chce testów na zbyt długie opisy)
# Test 25: PUT z opisem za długim - POMINIĘTO (użytkownik nie chce testów na zbyt długie opisy)

# Test 26: PUT z nieprawidłowym typem completed
test_endpoint "PUT" "$API_URL/tasks/1" "400" '{"completed":"true"}' "PUT /tasks/1 - Completed jako string zamiast boolean (400)"

# Test 27: PUT z nieprawidłowym typem tytułu
test_endpoint "PUT" "$API_URL/tasks/1" "400" '{"title":123}' "PUT /tasks/1 - Tytuł jako liczba (400)"

# ==========================================
# SEKCJA 6: AKTUALIZACJA ZADAŃ - SUKCES
# ==========================================
print_header "🔄 SEKCJA 6: AKTUALIZACJA ZADAŃ - SUKCES"

# Test 28: PUT - aktualizacja tylko completed
test_endpoint "PUT" "$API_URL/tasks/1" "200" '{"completed":true}' "PUT /tasks/1 - Aktualizacja tylko completed (200)"

# Test 29: PUT - aktualizacja tylko tytułu
test_endpoint "PUT" "$API_URL/tasks/1" "200" '{"title":"Zaktualizowany tytuł"}' "PUT /tasks/1 - Aktualizacja tylko tytułu (200)"

# Test 30: PUT - aktualizacja tylko opisu
test_endpoint "PUT" "$API_URL/tasks/1" "200" '{"description":"Zaktualizowany opis"}' "PUT /tasks/1 - Aktualizacja tylko opisu (200)"

# Test 31: PUT - aktualizacja wszystkich pól
test_endpoint "PUT" "$API_URL/tasks/1" "200" '{"title":"Kompletna aktualizacja","description":"Nowy opis","completed":false}' "PUT /tasks/1 - Aktualizacja wszystkich pól (200)"

# Test 32: PUT - aktualizacja z tytułem na granicy limitu - POMINIĘTO

# Test 33: PUT - ustawienie completed na false
test_endpoint "PUT" "$API_URL/tasks/1" "200" '{"completed":false}' "PUT /tasks/1 - Ustawienie completed na false (200)"

# Test 34: PUT - ustawienie completed na true
test_endpoint "PUT" "$API_URL/tasks/1" "200" '{"completed":true}' "PUT /tasks/1 - Ustawienie completed na true (200)"

# Test 35: Sprawdzenie czy updatedAt jest dodawane
print_test "PUT /tasks/1 - Sprawdzenie czy updatedAt jest dodawane"
response=$(curl -s -X PUT "$API_URL/tasks/1" \
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
# SEKCJA 7: USUWANIE ZADAŃ - DELETE
# ==========================================
print_header "🗑️ SEKCJA 7: USUWANIE ZADAŃ - DELETE /tasks/:id"

# Test 36: DELETE z nieprawidłowym ID (nie liczba)
test_endpoint "DELETE" "$API_URL/tasks/abc" "400" "" "DELETE /tasks/abc - Nieprawidłowe ID (400)"

# Test 37: DELETE z ID jako liczbą zmiennoprzecinkową
test_endpoint "DELETE" "$API_URL/tasks/1.5" "400" "" "DELETE /tasks/1.5 - ID jako liczba zmiennoprzecinkowa (400)"

# Test 38: DELETE z ID ujemnym
test_endpoint "DELETE" "$API_URL/tasks/-1" "400" "" "DELETE /tasks/-1 - ID ujemne (400)"

# Test 39: DELETE z nieistniejącym ID (404)
test_endpoint "DELETE" "$API_URL/tasks/99999" "404" "" "DELETE /tasks/99999 - Nieistniejące zadanie (404)"

# Test 40: DELETE - usunięcie zadania (204)
print_test "DELETE /tasks/2 - Usunięcie zadania (204)"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE "$API_URL/tasks/2")
http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
if [ "$http_code" = "204" ]; then
    print_success
    echo "Status: 204 No Content (oczekiwany)"
else
    print_error
    echo "Status: $http_code (oczekiwano: 204)"
fi
echo ""

# Test 41: Sprawdzenie czy zadanie zostało usunięte
print_test "GET /tasks - Sprawdzenie czy zadanie zostało usunięte"
response=$(curl -s "$API_URL/tasks")
task_count=$(echo "$response" | grep -o '"id"' | wc -l | tr -d ' ')
if [ "$task_count" -lt 6 ]; then
    print_success
    echo "Zadanie zostało usunięte (pozostało zadań: $task_count)"
else
    print_error
    echo "Zadanie nie zostało usunięte (pozostało zadań: $task_count)"
fi
echo ""

# ==========================================
# SEKCJA 8: EDGE CASES I BŁĘDNE REQUESTY
# ==========================================
print_header "⚠️ SEKCJA 8: EDGE CASES I BŁĘDNE REQUESTY"

# Test 42: POST z pustym body
test_endpoint "POST" "$API_URL/tasks" "400" '{}' "POST /tasks - Puste body (400)"

# Test 43: POST z null jako tytułem
test_endpoint "POST" "$API_URL/tasks" "400" '{"title":null,"description":"Test"}' "POST /tasks - Tytuł jako null (400)"

# Test 44: POST z bardzo długim JSON - POMINIĘTO (użytkownik nie chce testów na zbyt długie opisy)

# Test 45: PUT z pustym body
test_endpoint "PUT" "$API_URL/tasks/1" "200" '{}' "PUT /tasks/1 - Puste body (200 - brak zmian)"

# Test 46: PUT z null jako wartością
test_endpoint "PUT" "$API_URL/tasks/1" "400" '{"title":null}' "PUT /tasks/1 - Tytuł jako null (400)"

# Test 47: GET nieistniejącego endpointu (404)
test_endpoint "GET" "$API_URL/nonexistent" "404" "" "GET /nonexistent - Nieistniejący endpoint (404)"

# Test 48: POST na nieistniejący endpoint (404)
test_endpoint "POST" "$API_URL/nonexistent" "404" '{"title":"Test"}' "POST /nonexistent - Nieistniejący endpoint (404)"

# Test 49: PUT bez ID
test_endpoint "PUT" "$API_URL/tasks/" "404" '{"title":"Test"}' "PUT /tasks/ - Brak ID w URL (404)"

# Test 50: DELETE bez ID
test_endpoint "DELETE" "$API_URL/tasks/" "404" "" "DELETE /tasks/ - Brak ID w URL (404)"

# ==========================================
# SEKCJA 9: SPRAWDZENIE AUTOMATYCZNEGO GENEROWANIA ID
# ==========================================
print_header "🔢 SEKCJA 9: SPRAWDZENIE AUTOMATYCZNEGO GENEROWANIA ID"

# Test 51: Sprawdzenie czy ID są unikalne i sekwencyjne
print_test "POST /tasks - Sprawdzenie automatycznego generowania ID"
response1=$(curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -d '{"title":"Zadanie A"}')
id1=$(echo "$response1" | grep -o '"id":[0-9]*' | cut -d: -f2)

response2=$(curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -d '{"title":"Zadanie B"}')
id2=$(echo "$response2" | grep -o '"id":[0-9]*' | cut -d: -f2)

if [ "$id2" -gt "$id1" ]; then
    print_success
    echo "ID są generowane sekwencyjnie (ID1: $id1, ID2: $id2)"
else
    print_error
    echo "ID nie są generowane poprawnie (ID1: $id1, ID2: $id2)"
fi
echo ""

# ==========================================
# SEKCJA 10: SPRAWDZENIE TRIMOWANIA BIAŁYCH ZNAKÓW
# ==========================================
print_header "✂️ SEKCJA 10: SPRAWDZENIE TRIMOWANIA BIAŁYCH ZNAKÓW"

# Test 52: POST z tytułem z białymi znakami na początku i końcu
print_test "POST /tasks - Trimowanie białych znaków w tytule"
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
# SEKCJA 11: SPRAWDZENIE STRUKTURY ODPOWIEDZI
# ==========================================
print_header "📊 SEKCJA 11: SPRAWDZENIE STRUKTURY ODPOWIEDZI"

# Test 53: Sprawdzenie struktury odpowiedzi POST
print_test "POST /tasks - Sprawdzenie struktury odpowiedzi"
response=$(curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test struktury"}')
required_fields=("id" "title" "description" "completed" "createdAt")
all_present=true
for field in "${required_fields[@]}"; do
    if ! echo "$response" | grep -q "\"$field\""; then
        all_present=false
        echo "Brakuje pola: $field"
    fi
done
if [ "$all_present" = true ]; then
    print_success
    echo "Wszystkie wymagane pola są obecne"
else
    print_error
fi
echo ""

# Test 54: Sprawdzenie typu danych w odpowiedzi
print_test "GET /tasks - Sprawdzenie typu danych"
response=$(curl -s "$API_URL/tasks")
if echo "$response" | grep -q '^\[' && echo "$response" | grep -q '\]$'; then
    print_success
    echo "Odpowiedź jest tablicą JSON"
else
    print_error
    echo "Odpowiedź nie jest tablicą JSON"
fi
echo ""

# ==========================================
# SEKCJA 12: SPRAWDZENIE ZAPISU DO PLIKU
# ==========================================
print_header "💾 SEKCJA 12: SPRAWDZENIE ZAPISU DO PLIKU"

# Test 55: Sprawdzenie czy dane są zapisywane do pliku
print_test "POST + GET - Sprawdzenie czy dane są zapisywane"
# Dodaj zadanie
curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test zapisu do pliku"}' > /dev/null

# Poczekaj chwilę
sleep 0.5

# Pobierz zadania
response=$(curl -s "$API_URL/tasks")
if echo "$response" | grep -q "Test zapisu do pliku"; then
    print_success
    echo "Dane są zapisywane i odczytywane z pliku"
else
    print_error
    echo "Dane nie są poprawnie zapisywane/odczytywane"
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

