# Loja: benefícios com XP

## Publicação

Antes do deploy, executar `migration-shop-benefits.sql` no SQL Editor do Supabase. A migração adiciona somente `users.last_study_date`; é idempotente e não altera saldos.

Publicar cliente e servidor juntos. Clientes antigos precisam recarregar: atualizações de XP agora informam o saldo de origem (`xp_base`), para recusar sobrescritas de um saldo alterado em outro dispositivo.

## Comportamento

- Dica (30 XP): soma uma unidade. Em Lições, “Ver explicação” consome uma dica e revela a explicação antes de responder. A questão revelada fica no rascunho da atividade; voltar à mesma prática não cobra novamente.
- Bônus (150 XP): dobra somente o XP das lições salvas durante 24 horas. O servidor verifica a validade no salvamento. Não permite recomprar enquanto ativo.
- Proteção (100 XP): fica ativa até cobrir um dia sem exercícios registrados. Exemplo: estudo segunda e quarta mantém a sequência e consome a proteção; retorno quinta não cobre dois dias perdidos. Usa America/Sao_Paulo e a data do evento; reenvios antigos não contam como estudo de hoje. Na primeira atividade após a migração, preserva o contador anterior como ponto de partida.
- Caixa de XP (75 XP): entrega 50 XP (60%), 100 XP (30%) ou 200 XP (10%). A tela informa as probabilidades e que o prêmio pode ser inferior ao custo.
- Vidas retiradas da venda porque as atividades atuais não as consomem. O saldo anterior de vidas não é alterado.

XP continua sendo o saldo gasto e a pontuação exibida. Esta alteração não introduz moedas separadas nem altera o nível de inglês.

As compras e o consumo de dicas usam atualização condicional no banco, com nova leitura em caso de concorrência. Falhas de gravação não retornam sucesso. O perfil rejeita salvamento de XP sobre um saldo desatualizado. Isto não transforma a pontuação enviada pelo cliente em validação pedagógica no servidor; essa é uma melhoria separada.

## Verificação local

- `node --test server/test/*.test.js`: 129 testes aprovados, 1 ignorado, 0 falhas.
- `npm run build`: TypeScript e bundle aprovados.
- `node server/scripts/check-syntax.js`: sintaxe aprovada.
- `RUN_PLAYWRIGHT_E2E=1 node --test server/test/e2e/shop-benefits.test.js`: compra de dica e bônus, desconto correto, dica revelada e preservada ao trocar de aba, viewport de 390px.

Os testes usam dados simulados. Migração e compras reais em produção não foram executadas nesta alteração.
