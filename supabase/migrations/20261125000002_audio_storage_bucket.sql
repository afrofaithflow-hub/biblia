-- Migration: Criação do bucket público biblia-audio no Supabase Storage
-- Permite leitura pública por CDN de versículos em áudio neural
-- e gravação para reaproveitamento com custo zero de ElevenLabs entre todos os utilizadores.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'biblia-audio',
    'biblia-audio',
    true,
    10485760, -- 10MB máximo por ficheiro de áudio
    ARRAY['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav'];

-- Políticas de RLS para o bucket biblia-audio
DO $$
BEGIN
    -- 1. Leitura pública para qualquer visitante / ouvinte
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access for biblia-audio'
    ) THEN
        CREATE POLICY "Public Access for biblia-audio"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'biblia-audio');
    END IF;

    -- 2. Inserção para gravação do cache de áudio neural
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow Uploads to biblia-audio'
    ) THEN
        CREATE POLICY "Allow Uploads to biblia-audio"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'biblia-audio');
    END IF;
END $$;
