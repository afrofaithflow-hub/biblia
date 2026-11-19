-- ==============================================================================
-- BiblIA — Secção 5: Fundação de Dados e Webhooks de Pagamento
-- Tabela de idempotência, protecção RLS e função transacional para Edge Functions.
-- ==============================================================================

-- 1. Habilita extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Garante tipos enumerados de subscrição
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

-- 3. Garante existência defensiva da tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT DEFAULT 'Discípulo da Palavra',
  avatar_url TEXT,
  plan_tier INT NOT NULL DEFAULT 0 CHECK (plan_tier IN (0, 1, 2)),
  is_master_badge BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de subscrições (garantida com campos para provedor real)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_customer_id TEXT,
  external_subscription_id TEXT UNIQUE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  plan_tier INT NOT NULL CHECK (plan_tier IN (1, 2)),
  status public.subscription_status NOT NULL DEFAULT 'pending',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adiciona colunas externas caso a tabela já existisse de migrações anteriores
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS external_customer_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS external_subscription_id TEXT UNIQUE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe';

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_external_id
  ON public.subscriptions (external_subscription_id);

-- 5. Tabela de eventos de webhook para Idempotência Estrita
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'success', 'ignored', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_id
  ON public.payment_webhook_events (event_id);

-- 6. Configuração estrita de RLS (Row Level Security)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas permissivas se existirem
DROP POLICY IF EXISTS "Utilizador lê a própria subscrição" ON public.subscriptions;
DROP POLICY IF EXISTS "Utilizador cria a própria subscrição" ON public.subscriptions;
DROP POLICY IF EXISTS "Utilizador atualiza a própria subscrição" ON public.subscriptions;

-- Leitura: Utilizador lê apenas a sua própria subscrição
CREATE POLICY "Utilizador lê a própria subscrição"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Escrita: NENHUM utilizador (anon ou authenticated) pode inserir/atualizar subscriptions diretamente!
-- Mutações são permitidas exclusivamente pela service_role na Edge Function.

-- 7. Função Transacional Atómica de Aplicação de Subscrição
CREATE OR REPLACE FUNCTION public.apply_subscription_event(
  p_user_id UUID,
  p_customer_id TEXT,
  p_subscription_id TEXT,
  p_provider TEXT,
  p_tier INTEGER,
  p_status public.subscription_status,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN,
  p_cancelled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
  v_effective_tier INTEGER := 0;
  v_is_master BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id não pode ser nulo.';
  END IF;

  -- 1. Upsert na tabela subscriptions
  INSERT INTO public.subscriptions (
    user_id,
    external_customer_id,
    external_subscription_id,
    provider,
    plan_tier,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    cancelled_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_customer_id,
    p_subscription_id,
    COALESCE(p_provider, 'stripe'),
    p_tier,
    p_status,
    COALESCE(p_period_start, NOW()),
    COALESCE(p_period_end, NOW() + INTERVAL '1 month'),
    COALESCE(p_cancel_at_period_end, FALSE),
    p_cancelled_at,
    NOW()
  )
  ON CONFLICT (external_subscription_id) DO UPDATE
    SET status = EXCLUDED.status,
        plan_tier = EXCLUDED.plan_tier,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        cancelled_at = COALESCE(EXCLUDED.cancelled_at, public.subscriptions.cancelled_at),
        updated_at = NOW()
  RETURNING id INTO v_sub_id;

  -- 2. Determina o plano efetivo do perfil
  IF p_status = 'active' THEN
    v_effective_tier := p_tier;
    v_is_master := (p_tier = 2);
  ELSIF p_status = 'cancelled' THEN
    -- Cancelamento voluntário: mantém acesso pago até o fim do ciclo faturado
    IF p_period_end > NOW() THEN
      v_effective_tier := p_tier;
      v_is_master := (p_tier = 2);
    ELSE
      v_effective_tier := 0;
      v_is_master := FALSE;
    END IF;
  ELSE
    -- Expiração ('expired') ou falha ('past_due' após carência / 'incomplete')
    v_effective_tier := 0;
    v_is_master := FALSE;
  END IF;

  -- 3. Atualiza o perfil do utilizador atomicamente
  UPDATE public.profiles
  SET plan_tier = v_effective_tier,
      is_master_badge = v_is_master,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'effective_tier', v_effective_tier,
    'status', p_status
  );
END;
$$;

-- Permissões estritas: bloqueia acesso de clientes normais à função
REVOKE ALL ON FUNCTION public.apply_subscription_event FROM PUBLIC;
REVOKE ALL ON TABLE public.payment_webhook_events FROM PUBLIC;
