-- ============================================================================
-- KROK 1: Utworzenie tabel
-- ============================================================================

-- Tabela profili użytkowników (rozszerza auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela tasków
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- KROK 2: Trigger dla automatycznego tworzenia profilu
-- ============================================================================

-- Funkcja tworząca profil przy rejestracji użytkownika
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger wywoływany po utworzeniu użytkownika
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- KROK 3: Custom Access Token Hook (dodaje rolę do JWT)
-- ============================================================================

-- Funkcja dodająca rolę użytkownika do tokena JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  user_role TEXT;
  claims JSONB;
BEGIN
  -- Pobranie roli z tabeli profiles
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;
  
  -- Dodanie roli do claims
  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'user')));
  
  -- Zwrócenie zmodyfikowanego eventu
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql STABLE;

-- Nadanie uprawnień dla supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.profiles TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Cofnięcie dostępu dla innych ról (bezpieczeństwo)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM public;

-- ============================================================================
-- KROK 4: Row Level Security dla tabeli profiles
-- ============================================================================

-- Włączenie RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Użytkownicy mogą czytać swój profil LUB admini wszystkie
CREATE POLICY "Users can read own profile or admin all" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR (auth.jwt()->>'user_role')::text = 'admin'
  );

-- ============================================================================
-- KROK 5: Row Level Security dla tabeli tasks
-- ============================================================================

-- Włączenie RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Użytkownicy widzą tylko swoje taski
CREATE POLICY "Users can read own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Użytkownicy mogą tworzyć taski (przypisane do siebie)
CREATE POLICY "Users can create own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Użytkownicy mogą edytować swoje taski
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Użytkownicy mogą usuwać swoje taski
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Admini mają pełny dostęp do wszystkich tasków
CREATE POLICY "Admins have full access to tasks" ON public.tasks
  FOR ALL USING ((auth.jwt()->>'user_role')::text = 'admin');
