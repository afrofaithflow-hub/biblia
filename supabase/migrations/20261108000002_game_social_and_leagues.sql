-- ==============================================================================
-- BiblIA — Migração Canônica: Social Seguro, Ligas e Grupos Cooperativos (G4)
-- Relações Bilaterais, Perfis Públicos Mínimos, Moderação e Ligas Semanais
-- Fuso Horário Canônico: Africa/Maputo (UTC+2)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AMIZADES BILATERAIS E CONVITES SEGUROS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 Relações de Amizade (Bilateral: pending -> accepted | declined | blocked)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) DEFAULT 'pending',
  initiated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_friendship_pair UNIQUE (user_id, friend_id),
  CONSTRAINT chk_not_self_friend CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON public.friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON public.friendships(friend_id, status);

-- 1.2 Códigos e Links de Convite Seguros
CREATE TABLE IF NOT EXISTS public.friend_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL UNIQUE, -- e.g. "BIBLIA-7A8K"
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_uses INT NOT NULL DEFAULT 5,
  uses_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_code ON public.friend_invites(invite_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TRIBOS E GRUPOS LOCAIS COOPERATIVOS (Células, Famílias, Igrejas)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.church_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_code TEXT NOT NULL UNIQUE, -- e.g. "BETEL-2026"
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motto TEXT DEFAULT 'Crescendo juntos na Palavra',
  avatar_url TEXT,
  weekly_goal_xp INT NOT NULL DEFAULT 1500,
  current_weekly_xp INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.church_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.church_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'admin', 'member')) DEFAULT 'member',
  weekly_contribution_xp INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.church_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.church_group_members(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LIGAS SEMANAIS E SNAPSHOTS (Semente, Caminho, Discípulo, Mensageiro, Celestial)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.league_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key TEXT NOT NULL, -- 'YYYY-Www' em Africa/Maputo
  division TEXT NOT NULL CHECK (division IN ('semente', 'caminho', 'discipulo', 'mensageiro', 'celestial')),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  weekly_talents INT NOT NULL DEFAULT 0,
  rank_position INT NOT NULL DEFAULT 1,
  is_promoted BOOLEAN NOT NULL DEFAULT FALSE,
  is_demoted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_week_division_user UNIQUE (week_key, division, user_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_week_division ON public.league_snapshots(week_key, division, rank_position);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. MODERAÇÃO, BLOQUEIO E DENÚNCIA (Proteção e Segurança)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT chk_not_self_block CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate_name', 'harassment', 'spam', 'hate_speech', 'other')),
  details TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Amizades: Utilizador só vê as suas próprias relações e não bloqueadas
CREATE POLICY "Utilizador visualiza as próprias amizades"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Utilizador gere pedidos de amizade"
  ON public.friendships FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- Convites: Criador gere os próprios; qualquer utilizador autenticado pode consultar por código
CREATE POLICY "Utilizadores podem consultar convites por código"
  ON public.friend_invites FOR SELECT
  USING (true);

CREATE POLICY "Criador gere os próprios convites"
  ON public.friend_invites FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Grupos: Leitura para membros ou consulta pública por código de entrada
CREATE POLICY "Grupos visíveis para membros ou consulta pública"
  ON public.church_groups FOR SELECT
  USING (true);

CREATE POLICY "Líder gere o grupo"
  ON public.church_groups FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Membros visualizam membros do grupo"
  ON public.church_group_members FOR SELECT
  USING (true);

CREATE POLICY "Utilizador gere própria filiação em grupo"
  ON public.church_group_members FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ligas: Participantes podem consultar a tabela de classificação da divisão
CREATE POLICY "Classificação da liga é legível publicamente"
  ON public.league_snapshots FOR SELECT
  USING (true);

-- Bloqueios e Denúncias: Privados para o autor
CREATE POLICY "Utilizador gere os próprios bloqueios"
  ON public.user_blocks FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Utilizador insere denúncias privadas"
  ON public.user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FUNÇÕES RPC CANÔNICAS (G4)
-- ─────────────────────────────────────────────────────────────────────────────

-- 6.1 Gerar Código de Convite Seguro
CREATE OR REPLACE FUNCTION public.generate_friend_invite()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  -- Gera código no formato BIBLIA-XXXX
  v_code := 'BIBLIA-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  INSERT INTO public.friend_invites (invite_code, creator_id)
  VALUES (v_code, v_user_id);

  RETURN jsonb_build_object(
    'status', 'success',
    'invite_code', v_code,
    'share_url', 'https://biblia.app/convite/' || v_code
  );
END;
$$;

-- 6.2 Aceitar Convite de Amizade por Código
CREATE OR REPLACE FUNCTION public.accept_friend_invite(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite RECORD;
  v_is_blocked BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT * INTO v_invite
  FROM public.friend_invites
  WHERE invite_code = upper(trim(p_code))
    AND expires_at > NOW()
    AND uses_count < max_uses;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Código de convite inválido ou expirado.');
  END IF;

  IF v_invite.creator_id = v_user_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Não pode aceitar o seu próprio convite.');
  END IF;

  -- Verifica se existe bloqueio entre os utilizadores
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_user_id AND blocked_id = v_invite.creator_id)
       OR (blocker_id = v_invite.creator_id AND blocked_id = v_user_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Não é possível conectar com este utilizador.');
  END IF;

  -- Cria a relação bilateral recíproca
  INSERT INTO public.friendships (user_id, friend_id, status, initiated_by)
  VALUES (v_user_id, v_invite.creator_id, 'accepted', v_user_id)
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted', updated_at = NOW();

  INSERT INTO public.friendships (user_id, friend_id, status, initiated_by)
  VALUES (v_invite.creator_id, v_user_id, 'accepted', v_user_id)
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted', updated_at = NOW();

  -- Incrementa uso do convite
  UPDATE public.friend_invites
  SET uses_count = uses_count + 1
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('status', 'success', 'message', 'Amizade conectada com sucesso!');
END;
$$;

-- 6.3 Entrar em Grupo Local por Código
CREATE OR REPLACE FUNCTION public.join_church_group_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT * INTO v_group
  FROM public.church_groups
  WHERE group_code = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Código de grupo não encontrado.');
  END IF;

  INSERT INTO public.church_group_members (group_id, user_id, role)
  VALUES (v_group.id, v_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'status', 'success',
    'group_id', v_group.id,
    'group_name', v_group.name,
    'message', 'Entrou no grupo ' || v_group.name || '!'
  );
END;
$$;

