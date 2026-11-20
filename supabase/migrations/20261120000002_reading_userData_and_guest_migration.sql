-- =============================================================================
-- Migração Fase D1: Dados Reais de Leitura, Notas, Destaques e Migração de Visitante
-- Schema canónico offline-first com RLS estrito e Idempotência
-- Assinatura: Antigravity AI Engine | Africa/Maputo
-- =============================================================================

-- 1. Progresso e Posição de Leitura por Utilizador
CREATE TABLE IF NOT EXISTS public.user_reading_progress (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_book TEXT NOT NULL DEFAULT 'Gênesis',
    last_chapter INTEGER NOT NULL DEFAULT 1,
    last_verse INTEGER NOT NULL DEFAULT 1,
    translation_id TEXT NOT NULL DEFAULT 'blivre',
    total_chapters_read INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own reading progress" ON public.user_reading_progress;
    CREATE POLICY "Users can manage own reading progress"
        ON public.user_reading_progress
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

-- 2. Favoritos / Marcadores Bíblicos (Bookmarks)
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    verse_text TEXT,
    translation_id TEXT NOT NULL DEFAULT 'blivre',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, book, chapter, verse, translation_id)
);

ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.user_bookmarks;
    CREATE POLICY "Users can manage own bookmarks"
        ON public.user_bookmarks
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

-- 3. Notas e Reflexões Bíblicas
CREATE TABLE IF NOT EXISTS public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own notes" ON public.user_notes;
    CREATE POLICY "Users can manage own notes"
        ON public.user_notes
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

-- 4. Destaques / Marca-texto Colorido (Highlights)
CREATE TABLE IF NOT EXISTS public.user_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT 'teal', -- 'teal', 'gold', 'amber', 'rose'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, book, chapter, verse)
);

ALTER TABLE public.user_highlights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own highlights" ON public.user_highlights;
    CREATE POLICY "Users can manage own highlights"
        ON public.user_highlights
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

-- 5. Registo de Migrações de Dispositivo / Visitante (Device Claims)
CREATE TABLE IF NOT EXISTS public.guest_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    items_count JSONB NOT NULL DEFAULT '{}'::jsonb,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(installation_id, user_id)
);

ALTER TABLE public.guest_migrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read own migrations" ON public.guest_migrations;
    CREATE POLICY "Users can read own migrations"
        ON public.guest_migrations
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
END $$;

-- 6. RPC Transacional: migrate_guest_data
-- Recebe em lote os dados acumulados offline como visitante e integra na conta autenticada
CREATE OR REPLACE FUNCTION public.migrate_guest_data(
    p_installation_id TEXT,
    p_reading JSONB DEFAULT NULL,
    p_bookmarks JSONB DEFAULT '[]'::jsonb,
    p_notes JSONB DEFAULT '[]'::jsonb,
    p_highlights JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_bm RECORD;
    v_nt RECORD;
    v_hl RECORD;
    v_bm_count INT := 0;
    v_nt_count INT := 0;
    v_hl_count INT := 0;
    v_already_migrated BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Apenas utilizadores autenticados podem migrar dados de visitante.';
    END IF;

    -- Verificar idempotência: se este dispositivo já migrou para esta conta, ignora reprocessamento duplicado
    SELECT EXISTS (
        SELECT 1 FROM public.guest_migrations 
        WHERE installation_id = p_installation_id AND user_id = v_user_id
    ) INTO v_already_migrated;

    IF v_already_migrated THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Dados deste dispositivo já tinham sido migrados anteriormente.',
            'duplicate', true
        );
    END IF;

    -- 1. Sincronizar leitura atual (se informada)
    IF p_reading IS NOT NULL AND p_reading ? 'last_book' THEN
        INSERT INTO public.user_reading_progress (
            user_id, last_book, last_chapter, last_verse, translation_id, updated_at
        ) VALUES (
            v_user_id,
            COALESCE(p_reading->>'last_book', 'Gênesis'),
            COALESCE((p_reading->>'last_chapter')::INT, 1),
            COALESCE((p_reading->>'last_verse')::INT, 1),
            COALESCE(p_reading->>'translation_id', 'blivre'),
            now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            last_book = EXCLUDED.last_book,
            last_chapter = EXCLUDED.last_chapter,
            last_verse = EXCLUDED.last_verse,
            translation_id = EXCLUDED.translation_id,
            updated_at = now();
    END IF;

    -- 2. Inserir marcadores / favoritos
    IF jsonb_array_length(p_bookmarks) > 0 THEN
        FOR v_bm IN SELECT * FROM jsonb_to_recordset(p_bookmarks) AS x(
            book TEXT, chapter INT, verse INT, verse_text TEXT, translation_id TEXT
        )
        LOOP
            INSERT INTO public.user_bookmarks (
                user_id, book, chapter, verse, verse_text, translation_id
            ) VALUES (
                v_user_id, v_bm.book, v_bm.chapter, v_bm.verse, v_bm.verse_text, COALESCE(v_bm.translation_id, 'blivre')
            )
            ON CONFLICT (user_id, book, chapter, verse, translation_id) DO NOTHING;
            v_bm_count := v_bm_count + 1;
        END LOOP;
    END IF;

    -- 3. Inserir notas
    IF jsonb_array_length(p_notes) > 0 THEN
        FOR v_nt IN SELECT * FROM jsonb_to_recordset(p_notes) AS x(
            book TEXT, chapter INT, verse INT, content TEXT
        )
        LOOP
            IF v_nt.content IS NOT NULL AND trim(v_nt.content) != '' THEN
                INSERT INTO public.user_notes (
                    user_id, book, chapter, verse, content, updated_at
                ) VALUES (
                    v_user_id, v_nt.book, v_nt.chapter, v_nt.verse, v_nt.content, now()
                );
                v_nt_count := v_nt_count + 1;
            END IF;
        END LOOP;
    END IF;

    -- 4. Inserir destaques / highlights
    IF jsonb_array_length(p_highlights) > 0 THEN
        FOR v_hl IN SELECT * FROM jsonb_to_recordset(p_highlights) AS x(
            book TEXT, chapter INT, verse INT, color TEXT
        )
        LOOP
            INSERT INTO public.user_highlights (
                user_id, book, chapter, verse, color
            ) VALUES (
                v_user_id, v_hl.book, v_hl.chapter, v_hl.verse, COALESCE(v_hl.color, 'teal')
            )
            ON CONFLICT (user_id, book, chapter, verse) DO NOTHING;
            v_hl_count := v_hl_count + 1;
        END LOOP;
    END IF;

    -- 5. Registar a migração com sucesso
    INSERT INTO public.guest_migrations (
        installation_id, user_id, items_count
    ) VALUES (
        p_installation_id,
        v_user_id,
        jsonb_build_object(
            'bookmarks', v_bm_count,
            'notes', v_nt_count,
            'highlights', v_hl_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'migrated_items', jsonb_build_object(
            'bookmarks', v_bm_count,
            'notes', v_nt_count,
            'highlights', v_hl_count
        )
    );
END;
$$;
