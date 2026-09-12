-- Executar antes de publicar os benefícios da Loja.
-- Data de estudo em America/Sao_Paulo, separada de login e de XP gasto.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_study_date TEXT DEFAULT '';
