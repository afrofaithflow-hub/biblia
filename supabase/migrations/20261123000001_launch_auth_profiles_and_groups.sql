-- ==============================================================================
-- BiblIA — Migração Canónica de Lançamento v1.0
-- Trigger automática de perfis em auth.users, proteção de plano e grupos reais
-- Fuso Horário Canônico: Africa/Maputo (UTC+2)
-- ==============================================================================

-- 1. FUNÇÃO E TRIGGER AUTOMÁTICA PARA CRIAÇÃO DE PERFIL EM SIGN UP (OAuth / OTP / Senha)
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
  v_display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Discípulo'
  );
  v_avatar_url := NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), '');

  INSERT INTO public.profiles (id, email, display_name, avatar_url, plan_tier, is_master_badge)
  VALUES (NEW.id, NEW.email, v_display_name, v_avatar_url, 0, FALSE)
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill seguro para contas que já existiam antes do trigger
INSERT INTO public.profiles (id, email, display_name, avatar_url, plan_tier, is_master_badge)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    'Discípulo'
  ),
  NULLIF(trim(u.raw_user_meta_data->>'avatar_url'), ''),
  0,
  FALSE
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 2. PROTEÇÃO DE INTEGRIDADE DE SUBSCRIÇÃO E POLÍTICAS DE PERFIL
DO $$
BEGIN
  DROP POLICY IF EXISTS "Utilizador pode inserir seu próprio perfil básico" ON public.profiles;
  CREATE POLICY "Utilizador pode inserir seu próprio perfil básico"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id AND plan_tier = 0 AND is_master_badge = FALSE);
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas chamadas autenticadas de cliente têm colunas de subscrição congeladas.
  -- RPCs SECURITY DEFINER ou service_role (webhooks Stripe) mantêm permissão total.
  IF auth.role() = 'authenticated' AND current_setting('role', true) = 'authenticated' THEN
    NEW.plan_tier := OLD.plan_tier;
    NEW.is_master_badge := OLD.is_master_badge;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_billing ON public.profiles;
CREATE TRIGGER trg_protect_profile_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_billing_columns();

-- 3. POLÍTICAS E RPCs PARA GRUPOS/CÉLULAS REAIS (church_groups)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Utilizador autenticado cria grupos como líder" ON public.church_groups;
  CREATE POLICY "Utilizador autenticado cria grupos como líder"
    ON public.church_groups FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = leader_id);

  DROP POLICY IF EXISTS "Líder pode remover grupo vazio" ON public.church_groups;
  CREATE POLICY "Líder pode remover grupo vazio"
    ON public.church_groups FOR DELETE
    TO authenticated
    USING (auth.uid() = leader_id);
END $$;

CREATE OR REPLACE FUNCTION public.create_church_group(
  p_name TEXT,
  p_motto TEXT DEFAULT 'Crescendo juntos na Palavra'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_name TEXT := trim(COALESCE(p_name, ''));
  v_clean_motto TEXT := COALESCE(NULLIF(trim(p_motto), ''), 'Crescendo juntos na Palavra');
  v_code TEXT;
  v_group_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Entre na sua conta para criar um grupo.');
  END IF;

  IF length(v_clean_name) < 3 OR length(v_clean_name) > 60 THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'O nome do grupo deve ter entre 3 e 60 caracteres.');
  END IF;

  -- Gera código único no formato GRP-XXXXXX
  LOOP
    v_code := 'GRP-' || upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.church_groups WHERE group_code = v_code);
  END LOOP;

  INSERT INTO public.church_groups (name, group_code, leader_id, motto)
  VALUES (v_clean_name, v_code, v_user_id, left(v_clean_motto, 160))
  RETURNING id INTO v_group_id;

  INSERT INTO public.church_group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'leader')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'status', 'success',
    'group_id', v_group_id,
    'group_code', v_code,
    'name', v_clean_name,
    'message', 'Grupo criado com sucesso!'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_church_group(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_next_leader UUID;
  v_remaining_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Sessão não autenticada.');
  END IF;

  DELETE FROM public.church_group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Não faz parte deste grupo.');
  END IF;

  SELECT COUNT(*) INTO v_remaining_count
  FROM public.church_group_members
  WHERE group_id = p_group_id;

  IF v_remaining_count = 0 THEN
    DELETE FROM public.church_groups WHERE id = p_group_id;
  ELSE
    -- Se o líder saiu, promove o membro mais antigo automaticamente
    IF EXISTS (SELECT 1 FROM public.church_groups WHERE id = p_group_id AND leader_id = v_user_id) THEN
      SELECT user_id INTO v_next_leader
      FROM public.church_group_members
      WHERE group_id = p_group_id
      ORDER BY joined_at ASC
      LIMIT 1;

      IF v_next_leader IS NOT NULL THEN
        UPDATE public.church_groups SET leader_id = v_next_leader, updated_at = NOW() WHERE id = p_group_id;
        UPDATE public.church_group_members SET role = 'leader' WHERE group_id = p_group_id AND user_id = v_next_leader;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'success', 'message', 'Saiu do grupo com sucesso.');
END;
$$;

REVOKE ALL ON FUNCTION public.create_church_group(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_church_group(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.leave_church_group(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_church_group(UUID) TO authenticated;
