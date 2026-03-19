BEGIN;

-- Criar tabela principal
CREATE TABLE IF NOT EXISTS app_a3ade41d.roadmaps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL,
    titulo text NOT NULL,
    area text NOT NULL,
    nivel text NOT NULL DEFAULT 'iniciante',
    objetivo text,
    duracao_estimada_semanas integer DEFAULT 12,
    etapas jsonb NOT NULL DEFAULT '[]'::jsonb,
    progresso_atual integer DEFAULT 0,
    status text NOT NULL DEFAULT 'ativo',
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_roadmaps_usuario_id 
    ON app_a3ade41d.roadmaps(usuario_id);

CREATE INDEX IF NOT EXISTS idx_roadmaps_area_nivel 
    ON app_a3ade41d.roadmaps(area, nivel);

CREATE INDEX IF NOT EXISTS idx_roadmaps_criado_em 
    ON app_a3ade41d.roadmaps(criado_em DESC);

-- Adicionar constraints
ALTER TABLE app_a3ade41d.roadmaps
    ADD CONSTRAINT fk_roadmaps_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES app_a3ade41d.usuarios(id)
    ON DELETE CASCADE;

ALTER TABLE app_a3ade41d.roadmaps
    ADD CONSTRAINT check_nivel_valido
    CHECK (nivel IN ('iniciante', 'intermediario', 'avancado'));

ALTER TABLE app_a3ade41d.roadmaps
    ADD CONSTRAINT check_status_valido
    CHECK (status IN ('ativo', 'pausado', 'concluido', 'abandonado'));

ALTER TABLE app_a3ade41d.roadmaps
    ADD CONSTRAINT check_duracao_positiva
    CHECK (duracao_estimada_semanas > 0);

ALTER TABLE app_a3ade41d.roadmaps
    ADD CONSTRAINT check_progresso_nao_negativo
    CHECK (progresso_atual >= 0);

-- Habilitar RLS
ALTER TABLE app_a3ade41d.roadmaps ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS (com dependência explícita e comentário)
-- NOTA: Estas políticas assumem que a autenticação do Supabase está configurada
-- e que a função `auth.uid()` retorna o UUID do usuário autenticado.
-- Certifique-se de que a extensão `auth` e as tabelas necessárias estão disponíveis no schema.
CREATE POLICY "Usuários podem ver seus próprios roadmaps"
    ON app_a3ade41d.roadmaps
    FOR SELECT
    USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem criar roadmaps para si"
    ON app_a3ade41d.roadmaps
    FOR INSERT
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus próprios roadmaps"
    ON app_a3ade41d.roadmaps
    FOR UPDATE
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem deletar seus próprios roadmaps"
    ON app_a3ade41d.roadmaps
    FOR DELETE
    USING (usuario_id = auth.uid());

-- Criar função e trigger para atualizado_em
CREATE OR REPLACE FUNCTION app_a3ade41d.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roadmaps_updated_at
    BEFORE UPDATE ON app_a3ade41d.roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION app_a3ade41d.update_updated_at_column();

COMMIT;