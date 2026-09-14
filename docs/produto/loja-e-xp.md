# Loja: benefícios com XP

[Índice da documentação](../README.md)

## Publicação

Antes do deploy, executar `server/migration-shop-benefits.sql` e `server/migration-ten-lives.sql` no SQL Editor do Supabase. A primeira adiciona `users.last_study_date`. A segunda define o máximo de 10 vidas, preserva saldos válidos e cria o registro transacional de respostas de desafio. Ambas podem ser executadas novamente.

Publicar cliente e servidor juntos. Clientes antigos precisam recarregar: atualizações de XP agora informam o saldo de origem (`xp_base`), para recusar sobrescritas de um saldo alterado em outro dispositivo.

## Comportamento

- Dica (30 XP): soma uma unidade. Em Lições, “Ver explicação” consome uma dica e revela a explicação antes de responder. A questão revelada fica no rascunho da atividade; voltar à mesma prática não cobra novamente.
- Bônus (150 XP): dobra somente o XP das lições salvas durante 24 horas. O servidor verifica a validade no salvamento. Não permite recomprar enquanto ativo.
- Proteção (100 XP): fica ativa até cobrir um dia sem exercícios registrados. Exemplo: estudo segunda e quarta mantém a sequência e consome a proteção; retorno quinta não cobre dois dias perdidos. Usa America/Sao_Paulo e a data do evento; reenvios antigos não contam como estudo de hoje. Na primeira atividade após a migração, preserva o contador anterior como ponto de partida.
- Caixa de XP (75 XP): entrega 50 XP (60%), 100 XP (30%) ou 200 XP (10%). A tela informa as probabilidades e que o prêmio pode ser inferior ao custo.
- Vida extra (50 XP): recupera uma vida, até 10. Vidas cheias (200 XP): completa para 10. Saldo cheio bloqueia a compra no cliente e servidor, sem cobrar XP.
- Contas novas começam com 10 vidas. Contas existentes mantêm seu saldo entre 0 e 10, inclusive zero.
- Lições oferecem Prática livre (padrão, sem gasto) e Desafio (cada erro custa uma vida). Acertos não custam vidas. Zero impede novas respostas no desafio, mas mantém a prática livre e outras atividades disponíveis.
- O indicador mostra 10/10 Vidas cheias, 2–3 Poucas vidas, 1 Última vida e 0 Sem vidas para desafios.
- `record_challenge_answer` bloqueia a linha do usuário e registra o identificador da tentativa na mesma transação do desconto. Reenvios não descontam novamente. Não armazena texto da resposta; o resultado correto/incorreto ainda é informado pelo cliente, como nas atividades existentes. O RPC só pode ser executado pelo serviço do servidor.

XP continua sendo o saldo gasto e a pontuação exibida. Esta alteração não introduz moedas separadas nem altera o nível de inglês.

As compras e o consumo de dicas usam atualização condicional no banco, com nova leitura em caso de concorrência. Falhas de gravação não retornam sucesso. O perfil rejeita salvamento de XP sobre um saldo desatualizado. Isto não transforma a pontuação enviada pelo cliente em validação pedagógica no servidor; essa é uma melhoria separada.

## Verificação local

- `node --test server/test/*.test.js`: 130 testes aprovados, 1 ignorado, 0 falhas.
- `npm run build`: TypeScript e bundle aprovados.
- `node server/scripts/check-syntax.js`: sintaxe aprovada.
- `RUN_PLAYWRIGHT_E2E=1 node --test server/test/e2e/shop-benefits.test.js`: compra de dica e bônus, desconto correto, dica revelada e preservada ao trocar de aba, viewport de 390px. Também cobre último erro até zero, prática livre sem vidas e recuperação para 10.

A migração de vidas também foi executada duas vezes em PostgreSQL temporário: concorrência de reenvios, limite zero, acertos sem desconto e permissões do RPC aprovados.

Os testes usam dados simulados. Migração e compras reais em produção não foram executadas nesta alteração.
