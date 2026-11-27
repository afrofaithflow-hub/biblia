-- =============================================================================
-- BiblIA — Migração: Calibração de Quotas Canónicas do Assistente Teológico
-- Regra de Negócio: Free = 5 perguntas/dia, Premium = 25 perguntas/dia, Master = 60 perguntas/dia.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reserve_ai_quota()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tier INTEGER := 0;
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT COALESCE(plan_tier, 0) INTO v_tier
  FROM public.profiles WHERE id = v_user_id;

  -- Limites canónicos rigorosos do BiblIA
  v_limit := CASE v_tier
    WHEN 1 THEN 25   -- PREMIUM: 25 consultas / dia
    WHEN 2 THEN 60   -- MASTER: 60 consultas / dia
    ELSE 5           -- FREE: 5 consultas / dia
  END;

  INSERT INTO public.ai_daily_usage (user_id, usage_date, request_count, updated_at)
  VALUES (v_user_id, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET request_count = public.ai_daily_usage.request_count + 1,
        updated_at = NOW()
    WHERE public.ai_daily_usage.request_count < v_limit
  RETURNING request_count INTO v_count;

  IF v_count IS NULL THEN
    SELECT request_count INTO v_count
    FROM public.ai_daily_usage
    WHERE user_id = v_user_id AND usage_date = CURRENT_DATE;
    RETURN jsonb_build_object('allowed', false, 'limit', v_limit, 'remaining_today', 0);
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_limit,
    'remaining_today', GREATEST(0, v_limit - v_count)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_ai_quota() TO authenticated;
