@echo off
echo 🏪 Fazendo commit das alteracoes do sistema de estoque...
echo ================================================

echo 📦 Adicionando arquivos ao git...
git add .

echo 💾 Fazendo commit...
git commit -m "feat: Sistema de estoque por localizacao (Loja/Armazem)

- Adiciona campos stockLoja e stockArmazem na tabela Product
- Cria enum StockLocation e campos para movimentacoes
- Implementa APIs de entrada/saida por localizacao  
- Adiciona modal de transferencia entre estoques
- Atualiza interface para mostrar estoque separado
- Melhora botoes de acao dos produtos

NOVAS FUNCIONALIDADES:
- Estoque separado entre Loja e Armazem
- Botoes de entrada e saida por localizacao
- Modal de transferencia entre estoques
- Visualizacao de estoque por localizacao
- APIs REST completas para gestao de estoque
- Historico completo de movimentacoes"

echo 🚀 Fazendo push para o repositorio...
git push origin main

echo ✅ Commit realizado com sucesso!
echo 📋 Proximos passos:
echo    1. Acesse o EasyPanel
echo    2. Execute o deploy do Backend
echo    3. Execute a migration do banco: npx prisma migrate deploy
echo    4. Execute o deploy do Frontend  
echo    5. Teste a funcionalidade no sistema

echo 📄 Para instrucoes detalhadas, consulte: DEPLOY_ESTOQUE_EASYPANEL.md

pause