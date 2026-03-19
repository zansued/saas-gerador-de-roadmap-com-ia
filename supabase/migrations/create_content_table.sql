CREATE TABLE IF NOT EXISTS app_a3ade41d.conteudo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id UUID NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    url TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('artigo', 'video', 'curso', 'documentacao')),
    duracao_estimada_minutos INTEGER CHECK (duracao_estimada_minutos IS NULL OR duracao_estimada_minutos > 0),
    ordem INTEGER NOT NULL CHECK (ordem >= 1),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ,
    CONSTRAINT fk_roadmap FOREIGN KEY (roadmap_id) REFERENCES app_a3ade41d.roadmaps(id) ON DELETE CASCADE
);

-- Habilitar Row Level Security
ALTER TABLE app_a3ade41d.conteudo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- SELECT: Usuários podem ver conteúdo apenas de seus próprios roadmaps
CREATE POLICY conteudo_select_policy ON app_a3ade41d.conteudo
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_a3ade41d.roadmaps r
            WHERE r.id = conteudo.roadmap_id
            AND r.usuario_id = auth.uid()
        )
    );

-- INSERT: Usuários podem criar conteúdo apenas em seus próprios roadmaps
CREATE POLICY conteudo_insert_policy ON app_a3ade41d.conteudo
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM app_a3ade41d.roadmaps r
            WHERE r.id = roadmap_id
            AND r.usuario_id = auth.uid()
        )
    );

-- UPDATE: Usuários podem atualizar apenas conteúdo de seus próprios roadmaps
CREATE POLICY conteudo_update_policy ON app_a3ade41d.conteudo
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM app_a3ade41d.roadmaps r
            WHERE r.id = conteudo.roadmap_id
            AND r.usuario_id = auth.uid()
        )
    );

-- DELETE: Usuários podem deletar apenas conteúdo de seus próprios roadmaps
CREATE POLICY conteudo_delete_policy ON app_a3ade41d.conteudo
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM app_a3ade41d.roadmaps r
            WHERE r.id = conteudo.roadmap_id
            AND r.usuario_id = auth.uid()
        )
    );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conteudo_roadmap_id ON app_a3ade41d.conteudo(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_conteudo_roadmap_ordem ON app_a3ade41d.conteudo(roadmap_id, ordem);

-- Função para atualizar o timestamp de atualização
CREATE OR REPLACE FUNCTION app_a3ade41d.update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar atualizado_em
CREATE TRIGGER update_conteudo_atualizado_em
    BEFORE UPDATE ON app_a3ade41d.conteudo
    FOR EACH ROW
    EXECUTE FUNCTION app_a3ade41d.update_atualizado_em();

-- Função para validar ordem única por roadmap
CREATE OR REPLACE FUNCTION app_a3ade41d.validate_conteudo_ordem()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM app_a3ade41d.conteudo 
        WHERE roadmap_id = NEW.roadmap_id 
        AND ordem = NEW.ordem 
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Ordem % já existe para este roadmap', NEW.ordem;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para validar ordem
CREATE TRIGGER validate_conteudo_ordem_trigger
    BEFORE INSERT OR UPDATE ON app_a3ade41d.conteudo
    FOR EACH ROW
    EXECUTE FUNCTION app_a3ade41d.validate_conteudo_ordem();