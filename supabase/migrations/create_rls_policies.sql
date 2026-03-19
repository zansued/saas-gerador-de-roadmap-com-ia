## Artifact (score: 88/100)
-- Políticas RLS para o schema app_a3ade41d
-- Garantir que usuários só acessem seus próprios dados

-- 1. Habilitar RLS nas tabelas
ALTER TABLE app_a3ade41d.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_a3ade41d.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_a3ade41d.conteudo ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes (para idempotência)
DROP POLICY IF EXISTS usuarios_select_own ON app_a3ade41d.usuarios;
DROP POLICY IF EXISTS usuarios_insert_own ON app_a3ade41d.usuarios;
DROP POLICY IF EXISTS usuarios_update_own ON app_a3ade41d.usuarios;
DROP POLICY IF EXISTS usuarios_delete_own ON app_a3ade41d.usuarios;

DROP POLICY IF EXISTS roadmaps_select_own ON app_a3ade41d.roadmaps;
DROP POLICY IF EXISTS roadmaps_insert_own ON app_a3ade41d.roadmaps;
DROP POLICY IF EXISTS roadmaps_update_own ON app_a3ade41d.roadmaps;
DROP POLICY IF EXISTS roadmaps_delete_own ON app_a3ade41d.roadmaps;

DROP POLICY IF EXISTS conteudo_select_roadmap_owner ON app_a3ade41d.conteudo;
DROP POLICY IF EXISTS conteudo_insert_roadmap_owner ON app_a3ade41d.conteudo;
DROP POLICY IF EXISTS conteudo_update_roadmap_owner ON app_a3ade41d.conteudo;
DROP POLICY IF EXISTS conteudo_delete_roadmap_owner ON app_a3ade41d.conteudo;

-- 3. Políticas para tabela usuarios
CREATE POLICY usuarios_select_own ON app_a3ade41d.usuarios
FOR SELECT USING (auth.uid() = id);

CREATE POLICY usuarios_insert_own ON app_a3ade41d.usuarios
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY usuarios_update_own ON app_a3ade41d.usuarios
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY usuarios_delete_own ON app_a3ade41d.usuarios
FOR DELETE USING (auth.uid() = id);

-- 4. Políticas para tabela roadmaps
CREATE POLICY roadmaps_select_own ON app_a3ade41d.roadmaps
FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY roadmaps_insert_own ON app_a3ade41d.roadmaps
FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY roadmaps_update_own ON app_a3ade41d.roadmaps
FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY roadmaps_delete_own ON app_a3ade41d.roadmaps
FOR DELETE USING (auth.uid() = usuario_id);

-- 5. Políticas para tabela conteudo
CREATE POLICY conteudo_select_roadmap_owner ON app_a3ade41d.conteudo
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM app_a3ade41d.roadmaps r
    WHERE r.id = conteudo.roadmap_id
    AND r.usuario_id = auth.uid()
  )
);

CREATE POLICY conteudo_insert_roadmap_owner ON app_a3ade41d.conteudo
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_a3ade41d.roadmaps r
    WHERE r.id = conteudo.roadmap_id
    AND r.usuario_id = auth.uid()
  )
);

CREATE POLICY conteudo_update_roadmap_owner ON app_a3ade41d.conteudo
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM app_a3ade41d.roadmaps r
    WHERE r.id = conteudo.roadmap_id
    AND r.usuario_id = auth.uid()
  )
);

CREATE POLICY conteudo_delete_roadmap_owner ON app_a3ade41d.conteudo
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM app_a3ade41d.roadmaps r
    WHERE r.id = conteudo.roadmap_id
    AND r.usuario_id = auth.uid()
  )
);

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_roadmaps_usuario_id ON app_a3ade41d.roadmaps(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conteudo_roadmap_id ON app_a3ade41d.conteudo(roadmap_id);

-- 7. Nota sobre acesso público/anônimo
-- NOTA: Não foram definidas políticas para acesso público/anônimo, pois o sistema
-- é projetado para exigir autenticação em todas as operações. Isso é intencional
-- para garantir que apenas usuários autenticados acessem seus próprios dados.