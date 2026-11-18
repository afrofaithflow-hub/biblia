-- =============================================================================
-- BiblIA — Secção 4: Fundação segura do Assistente Teológico
-- Conversas privadas, quota diária atómica e auditoria sem guardar a pergunta.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  context_reference JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated
  ON public.ai_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 6000),
  kind TEXT CHECK (kind IN ('study', 'devotional', 'prayer', 'clarification')),
  references JSONB NOT NULL DEFAULT '[]'::jsonb,
  interpretation_note TEXT,
  safety_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created
  ON public.ai_messages (conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS public.ai_request_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'rejected', 'unavailable', 'provider_error')),
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_request_audit_user_created
  ON public.ai_request_audit (user_id, created_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilizador lê as próprias conversas de IA"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utilizador cria a própria conversa de IA"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilizador atualiza a própria conversa de IA"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilizador remove a própria conversa de IA"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Utilizador lê as próprias mensagens de IA"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- O cliente pode escrever apenas a sua pergunta. Respostas são escritas pela função.
CREATE POLICY "Utilizador cria perguntas nas próprias conversas de IA"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    role = 'user' AND EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Utilizador vê o próprio consumo de IA"
  ON public.ai_daily_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Consome uma pergunta sem aceitar um limite enviado pelo browser.
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

  -- Limites conservadores iniciais; o cliente não pode alterá-los.
  v_limit := CASE v_tier WHEN 0 THEN 3 WHEN 1 THEN 20 ELSE 60 END;

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

-- Exclusiva da Edge Function via service role: devolve a reserva se o fornecedor falhar.
CREATE OR REPLACE FUNCTION public.release_ai_quota(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_daily_usage
  SET request_count = GREATEST(0, request_count - 1), updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_ai_quota() TO authenticated;
REVOKE ALL ON FUNCTION public.release_ai_quota(UUID) FROM PUBLIC;
