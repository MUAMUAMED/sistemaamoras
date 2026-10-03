-- Script SQL para criar usuário de teste no PostgreSQL
-- Este script insere um usuário com email e senha (hash bcrypt) aleatórios
-- 
-- Uso:
--   psql -U postgres -d amoras_capital -f create-user.sql
--   ou via docker:
--   docker exec -i amoras-postgres psql -U postgres -d amoras_capital < create-user.sql

-- Gerar valores aleatórios
DO $$
DECLARE
    random_email TEXT;
    random_name TEXT;
    random_id TEXT;
    -- Hash bcrypt de uma senha padrão (será substituído pelo script PowerShell)
    -- Este é um hash de exemplo: "senha123" = $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
    password_hash TEXT := :password_hash;
BEGIN
    -- Gerar email aleatório
    random_email := 'teste_' || substr(md5(random()::text), 1, 8) || '@test.com';
    
    -- Gerar nome aleatório
    random_name := 'Usuário Teste ' || substr(md5(random()::text), 1, 4);
    
    -- Gerar ID (cuid format)
    random_id := 'cl' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    
    -- Inserir usuário
    INSERT INTO users (id, name, email, password, role, active, "createdAt", "updatedAt")
    VALUES (
        random_id,
        random_name,
        random_email,
        password_hash,
        'ADMIN',
        true,
        NOW(),
        NOW()
    );
    
    -- Mostrar resultado
    RAISE NOTICE '✅ Usuário criado com sucesso!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📧 Email: %', random_email;
    RAISE NOTICE '👤 Nome: %', random_name;
    RAISE NOTICE '🎭 Role: ADMIN';
    RAISE NOTICE '🆔 ID: %', random_id;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Mostrar o usuário criado
SELECT id, name, email, role, active, "createdAt" 
FROM users 
ORDER BY "createdAt" DESC 
LIMIT 1;

