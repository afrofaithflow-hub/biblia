-- =============================================================================
-- BiblIA — Migração: Captura Automática de Foto Google OAuth e Gestão de Avatares
-- Assegura que tanto 'avatar_url' quanto 'picture' dos metadados do Google são
-- gravados na coluna public.profiles.avatar_url.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- 1. Nome de exibição derivado
  v_display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Discípulo'
  );

  -- 2. Captura tanto avatar_url quanto picture (usado pelo Google OAuth)
  v_avatar_url := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'picture'), '')
  );

  -- 3. Inserção idempotente do perfil básico
  INSERT INTO public.profiles (id, email, display_name, avatar_url, plan_tier, is_master_badge)
  VALUES (NEW.id, NEW.email, v_display_name, v_avatar_url, 0, FALSE)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Atualizar perfis existentes que ainda não tenham avatar_url mas possuam foto nos metadados do utilizador
UPDATE public.profiles p
SET 
  avatar_url = COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'picture'), '')
  ),
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND p.avatar_url IS NULL
  AND (
    (u.raw_user_meta_data->>'avatar_url') IS NOT NULL 
    OR (u.raw_user_meta_data->>'picture') IS NOT NULL
  );
