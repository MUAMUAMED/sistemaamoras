-- Query para verificar o status dos produtos existentes
SELECT 
    id,
    name,
    "inProduction",
    active,
    "createdAt"
FROM products 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Query para atualizar produtos existentes para inProduction = true se necessário
-- DESCOMENTE A LINHA ABAIXO APENAS SE NECESSÁRIO:
-- UPDATE products SET "inProduction" = true WHERE "inProduction" = false;
