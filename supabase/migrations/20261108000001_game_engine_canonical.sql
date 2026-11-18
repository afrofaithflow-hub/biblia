-- ==============================================================================
-- BiblIA — Migração Canônica do Motor de Jogo e Gamificação (G3)
-- Arquitetura Relacional: Catálogo, Sessões Idempotentes, 3 Trilhas e Ledgers
-- Fuso Horário Canônico: Africa/Maputo (UTC+2)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CATÁLOGO CANÔNICO (Público para leitura)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 Mundos Canónicos
CREATE TABLE IF NOT EXISTS public.game_worlds (
  id INT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  testament TEXT NOT NULL CHECK (testament IN ('AT', 'NT')),
  focus TEXT NOT NULL,
  theme_color TEXT NOT NULL,
  icon TEXT NOT NULL,
  total_phases INT NOT NULL DEFAULT 10,
  review_title TEXT NOT NULL,
  achievement_badge TEXT NOT NULL,
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Fases Canónicas de cada Mundo
CREATE TABLE IF NOT EXISTS public.game_phases (
  id TEXT PRIMARY KEY,
  world_id INT NOT NULL REFERENCES public.game_worlds(id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('lesson', 'memory', 'guided_reading', 'blessing_chest', 'world_review', 'checkpoint')),
  scripture_reference TEXT NOT NULL,
  estimated_minutes INT NOT NULL DEFAULT 3,
  mode TEXT NOT NULL CHECK (mode IN ('quiz', 'true-false', 'fill-blanks', 'daily')),
  topics TEXT[] NOT NULL DEFAULT '{}',
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_world_phase UNIQUE (world_id, phase_number)
);

-- 1.3 Banco de Questões Canónicas
CREATE TABLE IF NOT EXISTS public.game_questions (
  id TEXT PRIMARY KEY,
  phase_id TEXT REFERENCES public.game_phases(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('quiz', 'true-false', 'fill-blanks', 'daily')),
  prompt TEXT NOT NULL,
  scripture_reference TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb, -- array de strings para quiz/fill-blanks
  answers JSONB NOT NULL DEFAULT '[]'::jsonb, -- array de strings com as respostas canónicas
  explanation TEXT NOT NULL,
  hint TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'Geral',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_kind ON public.game_questions(kind);
CREATE INDEX IF NOT EXISTS idx_questions_phase ON public.game_questions(phase_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROGRESSO E DOMÍNIO DO UTILIZADOR (Privado via RLS)
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 As 3 Trilhas de Progresso do Utilizador
CREATE TABLE IF NOT EXISTS public.user_game_progress (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  lifetime_xp INT NOT NULL DEFAULT 0 CHECK (lifetime_xp >= 0),
  walk_level INT NOT NULL DEFAULT 1 CHECK (walk_level >= 1),
  mastery_stars INT NOT NULL DEFAULT 0 CHECK (mastery_stars >= 0),
  streak_days INT NOT NULL DEFAULT 1 CHECK (streak_days >= 0),
  streak_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Progresso e Estrelas por Fase (1 a 3 estrelas por domínio)
CREATE TABLE IF NOT EXISTS public.user_phase_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phase_id TEXT NOT NULL REFERENCES public.game_phases(id) ON DELETE CASCADE,
  stars INT NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  attempts_count INT NOT NULL DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  retention_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_phase UNIQUE (user_id, phase_id)
);

CREATE INDEX IF NOT EXISTS idx_user_phase_user ON public.user_phase_progress(user_id);

-- 2.3 Fila de Repetição Espaçada (Leitner System: 1, 3, 7, 14, 30 dias)
CREATE TABLE IF NOT EXISTS public.user_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  phase_id TEXT,
  prompt TEXT NOT NULL,
  scripture_reference TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'Geral',
  failed_count INT NOT NULL DEFAULT 1,
  interval_days INT NOT NULL DEFAULT 1 CHECK (interval_days IN (1, 3, 7, 14, 30)),
  next_review_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_question_review UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_review_queue_user_date ON public.user_review_queue(user_id, next_review_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SESSÕES, RESPOSTAS E IDEMPOTÊNCIA (G3 Server-side)
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 Tentativas de Sessão (com attempt_id gerado pelo cliente/servidor para idempotência)
CREATE TABLE IF NOT EXISTS public.game_attempts (
  attempt_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  phase_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  score INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  talents_earned INT NOT NULL DEFAULT 0,
  stars_earned INT NOT NULL DEFAULT 0,
  lives_remaining INT NOT NULL DEFAULT 5,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  client_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_created ON public.game_attempts(user_id, created_at DESC);

-- 3.2 Log de Respostas da Tentativa (para auditoria e revisão espaçada)
CREATE TABLE IF NOT EXISTS public.game_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.game_attempts(attempt_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  used_hint BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON public.game_attempt_answers(attempt_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LIVROS RAZÃO IMUTÁVEIS (LEDGERS)
-- ─────────────────────────────────────────────────────────────────────────────

-- 4.1 Livro Razão de XP (Caminhada permanente)
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.game_attempts(attempt_id) ON DELETE SET NULL,
  amount INT NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL, -- e.g. 'lesson_completion', 'daily_challenge', 'spaced_review'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user ON public.xp_ledger(user_id, created_at DESC);

-- 4.2 Livro Razão de Talentos Semanais (Ligas sazonais renovadas)
CREATE TABLE IF NOT EXISTS public.weekly_talent_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.game_attempts(attempt_id) ON DELETE SET NULL,
  week_key TEXT NOT NULL, -- Formato 'YYYY-Www' em Africa/Maputo
  amount INT NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_talent_ledger_week ON public.weekly_talent_ledger(week_key, user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.game_worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phase_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_talent_ledger ENABLE ROW LEVEL SECURITY;

-- Catálogo: Leitura pública para todos os utilizadores autenticados e anónimos
CREATE POLICY "Catálogo de mundos é público para leitura"
  ON public.game_worlds FOR SELECT USING (true);

CREATE POLICY "Catálogo de fases é público para leitura"
  ON public.game_phases FOR SELECT USING (true);

CREATE POLICY "Questões ativas são públicas para leitura"
  ON public.game_questions FOR SELECT USING (is_active = true);

-- Progresso do Utilizador: apenas o próprio pode ler e modificar
CREATE POLICY "Utilizador acede ao próprio progresso"
  ON public.user_game_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilizador acede ao progresso de fases próprio"
  ON public.user_phase_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilizador acede à própria fila de revisão"
  ON public.user_review_queue FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sessões e Respostas: apenas o próprio utilizador
CREATE POLICY "Utilizador visualiza e grava próprias tentativas"
  ON public.game_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilizador visualiza e grava respostas da sessão"
  ON public.game_attempt_answers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ledgers: apenas leitura pelo utilizador; gravação por RPC ou sistema
CREATE POLICY "Utilizador visualiza o próprio XP ledger"
  ON public.xp_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utilizador insere no próprio XP ledger"
  ON public.xp_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilizador visualiza os próprios talentos semanais"
  ON public.weekly_talent_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utilizador insere no próprio talent ledger"
  ON public.weekly_talent_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FUNÇÃO RPC CANÔNICA DE FINALIZAÇÃO DE SESSÃO COM IDEMPOTÊNCIA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_game_session(
  p_attempt_id UUID,
  p_mode TEXT,
  p_phase_id TEXT,
  p_score INT,
  p_correct_count INT,
  p_total_count INT,
  p_xp_earned INT,
  p_talents_earned INT,
  p_stars_earned INT,
  p_lives_remaining INT,
  p_is_completed BOOLEAN,
  p_week_key TEXT,
  p_answers JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_attempt RECORD;
  v_ans RECORD;
  v_new_xp INT;
  v_new_level INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  -- 1. Verificação de Idempotência: Se attempt_id já foi registado, retorna sem duplicar
  SELECT * INTO v_existing_attempt FROM public.game_attempts WHERE attempt_id = p_attempt_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_recorded',
      'attempt_id', p_attempt_id,
      'message', 'Tentativa já sincronizada anteriormente.'
    );
  END IF;

  -- 2. Inserir tentativa de sessão
  INSERT INTO public.game_attempts (
    attempt_id, user_id, mode, phase_id, finished_at, score,
    correct_count, total_count, xp_earned, talents_earned, stars_earned,
    lives_remaining, is_completed
  ) VALUES (
    p_attempt_id, v_user_id, p_mode, p_phase_id, NOW(), p_score,
    p_correct_count, p_total_count, p_xp_earned, p_talents_earned, p_stars_earned,
    p_lives_remaining, p_is_completed
  );

  -- 3. Inserir respostas detalhadas
  FOR v_ans IN SELECT * FROM jsonb_to_recordset(p_answers) AS x(
    question_id TEXT,
    is_correct BOOLEAN,
    used_hint BOOLEAN
  )
  LOOP
    INSERT INTO public.game_attempt_answers (
      attempt_id, user_id, question_id, is_correct, used_hint
    ) VALUES (
      p_attempt_id, v_user_id, v_ans.question_id, v_ans.is_correct, COALESCE(v_ans.used_hint, FALSE)
    );
  END LOOP;

  -- 4. Gravar no Livro Razão de XP (se houver XP ganho)
  IF p_xp_earned > 0 THEN
    INSERT INTO public.xp_ledger (user_id, attempt_id, amount, reason)
    VALUES (v_user_id, p_attempt_id, p_xp_earned, 'game_session:' || p_mode);
  END IF;

  -- 5. Gravar no Livro Razão de Talentos Semanais (se houver talentos ganhos)
  IF p_talents_earned > 0 THEN
    INSERT INTO public.weekly_talent_ledger (user_id, attempt_id, week_key, amount, reason)
    VALUES (v_user_id, p_attempt_id, p_week_key, p_talents_earned, 'game_session:' || p_mode);
  END IF;

  -- 6. Atualizar Progresso do Utilizador (3 Trilhas)
  INSERT INTO public.user_game_progress (
    user_id, lifetime_xp, walk_level, mastery_stars, last_activity_date, updated_at
  ) VALUES (
    v_user_id, p_xp_earned, 1 + (p_xp_earned / 200), p_stars_earned, CURRENT_DATE, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_xp = public.user_game_progress.lifetime_xp + EXCLUDED.lifetime_xp,
    walk_level = 1 + ((public.user_game_progress.lifetime_xp + EXCLUDED.lifetime_xp) / 200),
    mastery_stars = public.user_game_progress.mastery_stars + EXCLUDED.mastery_stars,
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  RETURNING lifetime_xp, walk_level INTO v_new_xp, v_new_level;

  -- 7. Se associado a uma fase canônica, atualizar user_phase_progress
  IF p_phase_id IS NOT NULL THEN
    INSERT INTO public.user_phase_progress (
      user_id, phase_id, stars, is_completed, attempts_count, last_completed_at, updated_at
    ) VALUES (
      v_user_id, p_phase_id, p_stars_earned, p_is_completed, 1,
      CASE WHEN p_is_completed THEN NOW() ELSE NULL END, NOW()
    )
    ON CONFLICT (user_id, phase_id) DO UPDATE SET
      stars = GREATEST(public.user_phase_progress.stars, EXCLUDED.stars),
      is_completed = (public.user_phase_progress.is_completed OR EXCLUDED.is_completed),
      attempts_count = public.user_phase_progress.attempts_count + 1,
      last_completed_at = CASE WHEN EXCLUDED.is_completed THEN NOW() ELSE public.user_phase_progress.last_completed_at END,
      updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'attempt_id', p_attempt_id,
    'new_xp', v_new_xp,
    'new_level', v_new_level
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SEED DOS 7 MUNDOS CANÔNICOS E FASES DO MUNDO 1
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.game_worlds (
  id, slug, title, subtitle, testament, focus, theme_color, icon, total_phases, review_title, achievement_badge, is_unlocked, display_order
) VALUES
(1, 'mundo-1-criacao', 'A Criação e o Éden', 'Gênesis 1 a 11', 'AT', 'A criação dos céus e da terra, a queda no Éden, o dilúvio e a torre de Babel', '#00D494', 'public', 10, 'Síntese da Criação', 'Pioneiro da Fé', TRUE, 1),
(2, 'mundo-2-patriarcas', 'A Aliança dos Patriarcas', 'Gênesis 12 a 50', 'AT', 'O chamado de Abraão, a promessa a Isaque, Jacó e José no Egito', '#FFB800', 'handshake', 12, 'A Aliança Eterna', 'Filho da Promessa', FALSE, 2),
(3, 'mundo-3-exodo', 'O Êxodo e a Lei', 'Êxodo, Levítico, Números, Deuteronômio', 'AT', 'A libertação do Egito, a passagem do Mar Vermelho, o Tabernáculo e os Dez Mandamentos', '#FF7A00', 'local_fire_department', 14, 'O Tabernáculo no Deserto', 'Liberto do Egito', FALSE, 3),
(4, 'mundo-4-terra-prometida', 'A Terra Prometida e os Reis', 'Josué, Juízes, 1 e 2 Samuel, Reis', 'AT', 'A conquista de Canaã, a coragem de Davi contra Golias e a sabedoria do Templo de Salomão', '#4F46E5', 'shield', 15, 'O Reino Unido', 'Guardião da Aliança', FALSE, 4),
(5, 'mundo-5-profetas', 'Vozes dos Profetas', 'Profetas Maiores e Menores', 'AT', 'A fidelidade de Elias, as visões messiânicas de Isaías, a coragem de Daniel e Jonas em Nínive', '#0EA5E9', 'campaign', 12, 'A Esperança Messiânica', 'Sentinela da Palavra', FALSE, 5),
(6, 'mundo-6-evangelhos', 'O Evangelho da Graça', 'Mateus, Marcos, Lucas e João', 'NT', 'A encarnação, os milagres, o Sermão do Monte, o sacrifício na cruz e a gloriosa Ressurreição', '#10B981', 'menu_book', 16, 'O Triunfo da Cruz', 'Discípulo de Cristo', FALSE, 6),
(7, 'mundo-7-igreja-revelacao', 'A Igreja e a Esperança Final', 'Atos, Epístolas e Apocalipse', 'NT', 'O derramamento de Pentecostes, as viagens missionárias de Paulo e a vitória da Nova Jerusalém', '#8B5CF6', 'auto_awesome', 12, 'A Nova Criação', 'Servo Fiel', FALSE, 7)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  theme_color = EXCLUDED.theme_color,
  icon = EXCLUDED.icon;

-- Fases do Mundo 1
INSERT INTO public.game_phases (
  id, world_id, phase_number, title, description, node_type, scripture_reference, estimated_minutes, mode, topics, is_unlocked
) VALUES
('fase-1-1', 1, 1, 'O Princípio e a Luz', 'No princípio, criou Deus os céus e a terra. O surgimento da luz sobre o abismo.', 'lesson', 'Gênesis 1:1–5', 3, 'quiz', ARRAY['Criação', 'Luz', 'Soberania'], TRUE),
('fase-1-2', 1, 2, 'Haja Luz!', 'Memorize a primeira declaração criadora da boca do Altíssimo.', 'memory', 'Gênesis 1:3', 3, 'fill-blanks', ARRAY['Memorização', 'Luz'], TRUE),
('fase-1-3', 1, 3, 'Firmamento e Mares', 'A separação das águas superiores e inferiores e o surgimento da porção seca.', 'lesson', 'Gênesis 1:6–10', 4, 'true-false', ARRAY['Criação', 'Natureza'], TRUE),
('fase-1-4', 1, 4, 'Sol, Lua e Estrelas', 'Leitura atenta dos luminares celestes estabelecidos para governar o dia e a noite.', 'guided_reading', 'Gênesis 1:14–19', 3, 'quiz', ARRAY['Leitura Guiada', 'Tempo'], TRUE),
('fase-1-5', 1, 5, 'A Vida na Água e no Céu', 'O pulsar da vida aquática e das aves que voam sobre a face da terra.', 'lesson', 'Gênesis 1:20–23', 4, 'quiz', ARRAY['Criação', 'Vida'], FALSE),
('fase-1-6', 1, 6, 'O Baú do Sopro da Vida', 'Marco sagrado: contemplação da formação do ser humano do pó da terra.', 'blessing_chest', 'Gênesis 2:7', 2, 'fill-blanks', ARRAY['Vida', 'Bênção'], FALSE),
('fase-1-7', 1, 7, 'Imagem e Semelhança', 'A coroa da criação: a dignidade e propósito outorgados por Deus ao homem.', 'memory', 'Gênesis 1:26–27', 3, 'fill-blanks', ARRAY['Memorização', 'Humanidade'], FALSE),
('fase-1-8', 1, 8, 'O Éden e a Escolha', 'A árvore do conhecimento do bem e do mal, a desobediência e a promessa da redenção.', 'lesson', 'Gênesis 3:1–15', 5, 'true-false', ARRAY['Queda', 'Redenção'], FALSE),
('fase-1-9', 1, 9, 'O Dilúvio e a Aliança do Arco', 'A justiça de Noé, a arca da salvação e o sinal das nuvens.', 'lesson', 'Gênesis 6:9–22; 9:12–17', 5, 'quiz', ARRAY['Aliança', 'Fidelidade'], FALSE),
('fase-1-10', 1, 10, 'Síntese da Criação', 'Revisão geral do Mundo 1: ordene os 7 dias e consolide seu domínio sobre as origens.', 'world_review', 'Gênesis 1 a 11', 6, 'quiz', ARRAY['Revisão de Mundo', 'Síntese'], FALSE)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  node_type = EXCLUDED.node_type;

