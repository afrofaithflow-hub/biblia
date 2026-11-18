-- ==============================================================================
-- BiblIA — PRD Final v2.1 Migration
-- Subscrições, Planos (FREE, PREMIUM, MASTER), Arquitetura de Áudio e Segurança
-- ==============================================================================

-- Habilita extensão pgcrypto se ainda não existir
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TIPOS ENUMERADOS
DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM (
      'active',
      'pending',
      'past_due',
      'cancelled',
      'expired',
      'incomplete'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE PERFIS DE UTILIZADOR
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT DEFAULT 'Discípulo da Palavra',
  avatar_url TEXT,
  plan_tier INT NOT NULL DEFAULT 0 CHECK (plan_tier IN (0, 1, 2)), -- 0=FREE, 1=PREMIUM, 2=MASTER
  is_master_badge BOOLEAN NOT NULL DEFAULT FALSE,
  xp INT NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 1,
  streak_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  streak_last_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA DE SUBSCRIÇÕES
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_subscription_id TEXT UNIQUE,
  provider TEXT NOT NULL DEFAULT 'sandbox', -- 'stripe', 'lemonsqueezy', 'sandbox'
  plan_tier INT NOT NULL CHECK (plan_tier IN (1, 2)),
  status public.subscription_status NOT NULL DEFAULT 'pending',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- 4. HISTÓRICO DE AUDITORIA DE SUBSCRIÇÕES
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_status public.subscription_status,
  new_status public.subscription_status NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CATÁLOGO DE ÁUDIO REUTILIZÁVEL (HASH CACHE & STORAGE)
CREATE TABLE IF NOT EXISTS public.audio_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL, -- sha256(book + chapter + lang + translation + voice_id + ambient_id)
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt',
  translation TEXT NOT NULL DEFAULT 'NVI',
  voice_id TEXT NOT NULL,
  ambient_id TEXT NOT NULL DEFAULT 'none',
  storage_path TEXT NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  tts_provider TEXT NOT NULL DEFAULT 'neural_ai',
  generation_cost_usd NUMERIC(8, 6) NOT NULL DEFAULT 0.000000,
  play_count BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('generating', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_catalog_ref ON public.audio_catalog(book, chapter, language, translation);

-- 6. REGISTO DE DOWNLOADS DIÁRIOS (CONTROLO DE COTAS)
CREATE TABLE IF NOT EXISTS public.daily_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_ref TEXT NOT NULL, -- e.g. "João 3" ou "Salmos 23"
  download_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, chapter_ref, download_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_downloads_user_date ON public.daily_downloads(user_id, download_date);

-- 7. GRUPOS E CLÃS (EXCLUSIVO MASTER PARA CRIAÇÃO)
CREATE TABLE IF NOT EXISTS public.clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  badge_url TEXT,
  member_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clan_members (
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'elder', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clan_id, user_id)
);

-- 8. EVENTOS DE PAGAMENTO E AUDITORIA (IDEMPOTÊNCIA DE WEBHOOKS)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  error_log TEXT
);

-- ==============================================================================
-- 9. FUNÇÕES DE SUPORTE E REGRAS DE NEGÓCIO (RPC)
-- ==============================================================================

-- 9.1 Função para verificar e consumir cota de download diário
CREATE OR REPLACE FUNCTION public.check_and_register_download(
  p_user_id UUID,
  p_chapter_ref TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier INT;
  v_status public.subscription_status;
  v_count INT;
  v_max_downloads CONSTANT INT := 5;
BEGIN
  -- 1. Obter nível e status de subscrição
  SELECT p.plan_tier, COALESCE(s.status, 'expired')
  INTO v_tier, v_status
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
  WHERE p.id = p_user_id
  ORDER BY s.current_period_end DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
  END IF;

  -- 2. FREE: Sem direito a downloads offline
  IF v_tier = 0 OR v_status != 'active' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'tier', 0,
      'reason', 'requires_premium_or_master',
      'remaining_today', 0
    );
  END IF;

  -- 3. MASTER: Downloads ilimitados
  IF v_tier = 2 AND v_status = 'active' THEN
    -- Regista para fins de telemetria / histórico
    INSERT INTO public.daily_downloads (user_id, chapter_ref, download_date)
    VALUES (p_user_id, p_chapter_ref, CURRENT_DATE)
    ON CONFLICT (user_id, chapter_ref, download_date) DO NOTHING;

    RETURN jsonb_build_object(
      'allowed', true,
      'tier', 2,
      'unlimited', true,
      'remaining_today', 9999
    );
  END IF;

  -- 4. PREMIUM: Até 5 capítulos únicos por dia
  IF v_tier = 1 AND v_status = 'active' THEN
    SELECT COUNT(*)
    INTO v_count
    FROM public.daily_downloads
    WHERE user_id = p_user_id AND download_date = CURRENT_DATE;

    -- Se já descarregou este mesmo capítulo hoje, permite sem gastar nova cota
    IF EXISTS (
      SELECT 1 FROM public.daily_downloads
      WHERE user_id = p_user_id AND chapter_ref = p_chapter_ref AND download_date = CURRENT_DATE
    ) THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'tier', 1,
        'already_downloaded_today', true,
        'remaining_today', GREATEST(0, v_max_downloads - v_count)
      );
    END IF;

    -- Se atingiu o limite de 5
    IF v_count >= v_max_downloads THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'tier', 1,
        'reason', 'daily_limit_reached',
        'limit', v_max_downloads,
        'remaining_today', 0
      );
    END IF;

    -- Regista novo download
    INSERT INTO public.daily_downloads (user_id, chapter_ref, download_date)
    VALUES (p_user_id, p_chapter_ref, CURRENT_DATE);

    RETURN jsonb_build_object(
      'allowed', true,
      'tier', 1,
      'remaining_today', v_max_downloads - (v_count + 1)
    );
  END IF;

  RETURN jsonb_build_object('allowed', false, 'reason', 'unhandled_state');
END;
$$;

-- 9.2 Função de verificação para criação de Clãs (Apenas MASTER)
CREATE OR REPLACE FUNCTION public.can_create_clan(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier INT;
  v_status public.subscription_status;
BEGIN
  SELECT p.plan_tier, COALESCE(s.status, 'expired')
  INTO v_tier, v_status
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
  WHERE p.id = p_user_id
  ORDER BY s.current_period_end DESC
  LIMIT 1;

  RETURN (v_tier = 2 AND v_status = 'active');
END;
$$;

-- 9.3 Função para processar webhook de subscrição com idempotência
CREATE OR REPLACE FUNCTION public.process_subscription_event(
  p_event_id TEXT,
  p_provider TEXT,
  p_event_type TEXT,
  p_user_id UUID,
  p_plan_tier INT,
  p_status public.subscription_status,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_external_sub_id TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  -- 1. Idempotência: verificar se evento já foi processado
  IF EXISTS (SELECT 1 FROM public.payment_events WHERE event_id = p_event_id AND processed = true) THEN
    RETURN jsonb_build_object('status', 'already_processed', 'event_id', p_event_id);
  END IF;

  -- 2. Registar evento
  INSERT INTO public.payment_events (event_id, provider, event_type, payload, processed)
  VALUES (p_event_id, p_provider, p_event_type, p_payload, false)
  ON CONFLICT (event_id) DO UPDATE SET event_type = EXCLUDED.event_type;

  -- 3. Atualizar ou inserir subscrição
  INSERT INTO public.subscriptions (
    user_id,
    external_subscription_id,
    provider,
    plan_tier,
    status,
    current_period_start,
    current_period_end,
    metadata
  )
  VALUES (
    p_user_id,
    p_external_sub_id,
    p_provider,
    p_plan_tier,
    p_status,
    p_period_start,
    p_period_end,
    p_payload
  )
  ON CONFLICT (external_subscription_id) DO UPDATE SET
    plan_tier = EXCLUDED.plan_tier,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = NOW()
  RETURNING id INTO v_sub_id;

  -- 4. Sincronizar o plan_tier e badge no perfil do utilizador
  IF p_status = 'active' THEN
    UPDATE public.profiles
    SET plan_tier = p_plan_tier,
        is_master_badge = (p_plan_tier = 2),
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Se cancelado com período terminado ou expirado, rebaixa para FREE (0)
    IF p_status IN ('expired', 'incomplete') OR (p_status = 'cancelled' AND NOW() > p_period_end) THEN
      UPDATE public.profiles
      SET plan_tier = 0,
          is_master_badge = FALSE,
          updated_at = NOW()
      WHERE id = p_user_id;
    END IF;
  END IF;

  -- 5. Marcar evento como processado
  UPDATE public.payment_events
  SET processed = true, processed_at = NOW()
  WHERE event_id = p_event_id;

  RETURN jsonb_build_object('status', 'success', 'subscription_id', v_sub_id, 'plan_tier', p_plan_tier);
END;
$$;

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Leitura pública, gravação apenas pelo próprio utilizador
CREATE POLICY "Profiles são visíveis publicamente"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Utilizador pode editar seu próprio perfil básico"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Subscriptions: Visível apenas pelo próprio assinante
CREATE POLICY "Utilizador pode ver suas próprias subscrições"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Audio Catalog: Leitura pública do catálogo
CREATE POLICY "Qualquer utilizador pode consultar o catálogo de áudio"
  ON public.audio_catalog FOR SELECT
  USING (true);

-- Daily Downloads: Visível apenas pelo próprio utilizador
CREATE POLICY "Utilizador visualiza seus próprios downloads"
  ON public.daily_downloads FOR SELECT
  USING (auth.uid() = user_id);

-- Clans & Clan Members: Leitura pública
CREATE POLICY "Clãs são visíveis para todos"
  ON public.clans FOR SELECT
  USING (true);

CREATE POLICY "Membros de clãs visíveis para todos"
  ON public.clan_members FOR SELECT
  USING (true);

CREATE POLICY "Apenas utilizadores elegíveis podem criar clãs"
  ON public.clans FOR INSERT
  WITH CHECK (auth.uid() = leader_id AND public.can_create_clan(auth.uid()));
