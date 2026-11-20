-- ==============================================================================
-- BiblIA — Fix: Elimina todas as versões ambíguas de apply_subscription_event
-- e recria com assinatura canónica única + REVOKE correcto.
-- Execute este script no SQL Editor do Supabase ANTES de re-executar a migração 1.
-- ==============================================================================

-- 1. Apaga TODAS as sobrecargas existentes da função pelo nome
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_sig
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
    AND    p.proname = 'apply_subscription_event'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
  END LOOP;
END;
$$;

-- 2. Recria a função com assinatura canónica única
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
    SET status                 = EXCLUDED.status,
        plan_tier              = EXCLUDED.plan_tier,
        current_period_start   = EXCLUDED.current_period_start,
        current_period_end     = EXCLUDED.current_period_end,
        cancel_at_period_end   = EXCLUDED.cancel_at_period_end,
        cancelled_at           = COALESCE(EXCLUDED.cancelled_at, public.subscriptions.cancelled_at),
        updated_at             = NOW()
  RETURNING id INTO v_sub_id;

  -- 2. Determina o plano efetivo do perfil
  IF p_status = 'active' THEN
    v_effective_tier := p_tier;
    v_is_master := (p_tier = 2);
  ELSIF p_status = 'cancelled' THEN
    IF p_period_end > NOW() THEN
      v_effective_tier := p_tier;
      v_is_master := (p_tier = 2);
    ELSE
      v_effective_tier := 0;
      v_is_master := FALSE;
    END IF;
  ELSE
    v_effective_tier := 0;
    v_is_master := FALSE;
  END IF;

  -- 3. Atualiza o perfil atomicamente
  UPDATE public.profiles
  SET plan_tier        = v_effective_tier,
      is_master_badge  = v_is_master,
      updated_at       = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success',         true,
    'subscription_id', v_sub_id,
    'effective_tier',  v_effective_tier,
    'status',          p_status
  );
END;
$$;

-- 3. Permissões estritas: apenas service_role pode chamar esta função
REVOKE ALL ON FUNCTION public.apply_subscription_event(
  UUID, TEXT, TEXT, TEXT, INTEGER,
  public.subscription_status,
  TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ
) FROM PUBLIC;

REVOKE ALL ON TABLE public.payment_webhook_events FROM PUBLIC;
