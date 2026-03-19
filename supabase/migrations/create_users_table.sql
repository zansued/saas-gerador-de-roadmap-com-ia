-- Migration: create_users_table.sql
-- Schema: app_user_data (OBRIGATÓRIO)
-- Tabela: usuarios
-- Propósito: Armazenar dados de perfil dos usuários

-- Garantir que o schema existe
CREATE SCHEMA IF NOT EXISTS app_user_data;

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS app_user_data.usuarios (
    id UUID PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    assinatura_ativa BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints adicionais
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Comentários para documentação
COMMENT ON TABLE app_user_data.usuarios IS 'Armazena dados de perfil dos usuários do sistema de roadmaps';
COMMENT ON COLUMN app_user_data.usuarios.id IS 'ID único do usuário (referencia auth.users.id)';
COMMENT ON COLUMN app_user_data.usuarios.email IS 'Email do usuário (deve ser único)';
COMMENT ON COLUMN app_user_data.usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN app_user_data.usuarios.assinatura_ativa IS 'Indica se o usuário tem assinatura ativa';
COMMENT ON COLUMN app_user_data.usuarios.criado_em IS 'Data e hora de criação do registro';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON app_user_data.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_assinatura_ativa ON app_user_data.usuarios(assinatura_ativa);
CREATE INDEX IF NOT EXISTS idx_usuarios_criado_em ON app_user_data.usuarios(criado_em);