# Franquias de IA e operação para 50 alunos

## Implementado

| Nova política | Mensalidade anunciada | Usos no mês-calendário UTC | Proteção diária UTC |
|---|---:|---:|---:|
| Free | Grátis | 100 | 10 |
| Pro | R$ 45 | 1.000 | 50 |
| Max | R$ 85 | 3.000 | 150 |

O limite diário está dentro da franquia mensal. A franquia não acumula. Uma mensagem enviada à IA, uma sugestão e uma análise são operações distintas de 1 uso. Outras funcionalidades que utilizam os mesmos endpoints autenticados de IA também compartilham a franquia. Atividades sem IA continuam disponíveis ao esgotar a franquia. A renovação mensal de uso ocorre no início de cada mês UTC, separada do aniversário da cobrança; a interface converte o horário para o fuso do aluno. Upgrades não zeram contadores.

A migração marca assinaturas pagas ativas como política 1: Pro 300/dia e Max 1.000/dia, sem franquia mensal nova. Assinaturas Stripe sem metadata de política também preservam o contrato anterior, inclusive na renovação. Os novos checkouts usam `subscription_data.metadata.ai_policy_version=2`. Não há migração automática das assinaturas antigas. Planejar e comunicar uma transição antes de alterar sua metadata; preservar o período contratado. O preço cadastrado na Stripe é verificado antes do checkout (BRL, mensal, R$ 45/85). Nenhum preço remoto é alterado.

O RPC `consume_ai_use_v2` reserva 1 uso com bloqueio transacional por aluno. O mesmo banco atende todas as instâncias. Há também 30 requisições por minuto UTC por aluno em todas essas rotas juntas. Falhas não reiniciam esse contador de proteção. A limitação por IP de conversa foi removida; login e outros endpoints mantêm suas proteções próprias.

Validação de corpo e tamanho ocorre antes da reserva. A resposta de erro do servidor devolve o uso com `finish_ai_use`, idempotente e protegido contra concorrência. Desconexão do cliente não devolve automaticamente uma chamada que pode já ter sido paga ao provedor. Se o banco ficar indisponível durante a finalização, o servidor tenta novamente e registra `ai_settlement_failed` com a reserva; é necessário reconciliar esses casos. Uma queda do processo após a reserva também pode deixar um débito pendente: não há reembolso automático presumindo que não houve geração.

## Limites de geração e histórico

- Todos os caminhos pelo adaptador Gemini têm teto de 32.000 bytes de mensagens e 2.048 tokens de saída. Quando não informado pelo chamador, o teto de saída é 1.024. O cliente não pode aumentá-lo.
- Os endpoints de alunos aceitam até 24.000 bytes de corpo validado. Entradas maiores são rejeitadas sem reservar uso.
- Conversa envia somente as últimas 10 mensagens de histórico; formular resposta envia 8. Isso corrige a falha que acontecia ao superar 20 itens antes do corte do servidor.
- A análise considera as últimas 10 mensagens do aluno, explicado na interface. A conversa completa continua no rascunho de atividade existente; a telemetria não a copia.
- “Sair sem analisar” permite encerrar sem gastar outro uso. As operações de envio, sugestão e encerramento não podem iniciar ao mesmo tempo na mesma tela.
- O saldo exibido é reconciliado com o servidor após cada operação, inclusive erros. Falha de atualização será corrigida na próxima consulta de perfil.

## Custo e privacidade

Admin → IA e operação mostra 30 dias UTC agrupados por plano e modelo: tentativas, falhas, latência média, tokens de entrada, cache, resposta e raciocínio, além de custo estimado em USD. Retentativas são registradas individualmente, incluindo geração truncada com uso conhecido. Registros sem uso ou preço conhecido são marcados como incompletos; não equivalem a custo zero. A telemetria não salva perguntas ou respostas.

Tarifas de referência consultadas em 12/09/2026: https://ai.google.dev/gemini-api/docs/pricing. O cálculo considera cache e tokens de raciocínio. O preço promocional do Gemini 3.6 Flash muda automaticamente em 01/01/2027 conforme a tabela consultada. Outros reajustes precisam atualizar `server/services/ai-policy.js`. Essa estimativa não substitui a fatura, nem inclui impostos, hospedagem e outras APIs. Os limites de chamadas e tamanho reduzem exposição, mas não garantem margem fixa; acompanhe o custo real, principalmente dos contratos antigos.

Falhas ao persistir consumo geram `ai_usage_write_failed` nos logs; nesses casos o Admin pode subestimar o total. A escrita de telemetria tem prazo de 1,5 s e não provoca repetição da geração caso falhe. As reservas guardam ID do aluno para idempotência/reembolso, sem textos. A agregação de custo guarda apenas dia, plano e modelo.

## Ordem de implantação

1. Aplicar `server/migrations/20260912-ai-plan-quotas.sql` no SQL Editor do Supabase antes de publicar o servidor. Script transacional e reexecutável; preserva o RPC antigo para permitir implantação gradual.
2. Publicar o código. Conferir `/readyz`, login, `/api/subscription/status` com uma conta nova e uma antiga, além do Admin. A alteração não exige novos preços na Stripe; conferir que os IDs existentes apontam para BRL mensal de R$ 45/85.
3. Em produção, o servidor executa `cleanup_ai_usage` na inicialização e a cada 24 horas enquanto estiver ativo. Ele remove reservas com mais de 35 dias e agregados com mais de 90 dias. Falhas geram `ai_cleanup_failed`. Em instâncias suspensas, a próxima inicialização retoma a limpeza; um agendamento externo pode ser usado se for necessária pontualidade independente do servidor.
4. Manter `AI_CONVERSATION_MODEL` vazio até concluir a avaliação real. A ausência mantém `GEMINI_MODEL`, sem troca silenciosa. Não deixar um modelo mais barato sem validação pedagógica atender alunos pagantes.
5. Comparar candidato e modelo atual usando apenas entradas sintéticas; revisar correções, explicações, adequação ao nível e naturalidade. Se aprovado, definir `AI_CONVERSATION_MODEL=gemini-3.1-flash-lite` no servidor. Isso afeta conversa, sugestão e análise gramatical; outras atividades continuam usando sua configuração anterior. Reverter removendo a variável.

## Testes e limites da evidência

```sh
npm run check
npm test
npm run build
python3 server/test/ai-quotas-postgres.py
RUN_PLAYWRIGHT_E2E=1 node --test server/test/e2e/ai-allowance.test.js server/test/e2e/admin-workspace.test.js server/test/e2e/subscription-management.test.js server/test/e2e/activity-resume.test.js
```

O teste PostgreSQL cria e destrói um cluster local isolado. Verifica concorrência real de 50 alunos, limite mensal e diário, rate limit por aluno, política antiga, virada de datas, devolução idempotente, agregação concorrente e permissões. O teste HTTP usa IA e armazenamento simulados: 50 alunos no mesmo IP passaram, com p95 local observado de 60 ms. Isso não comprova capacidade do Render, Redis, Supabase remoto ou Gemini; medir essas dependências no piloto com quotas e ambiente configurados. Não equivale a um teste com alunos reais.

Validação final: 12 testes do cliente e 140 do servidor aprovados (15 testes opt-in ignorados na suíte padrão). Os quatro testes de navegador listados acima passaram, incluindo retomada entre dispositivos. Build e verificação de sintaxe aprovados.

### Avaliação real pendente

A execução em 12/09/2026 (horário local) encontrou `GEMINI_API_KEY` ausente. Relatório em `server/evals/results/flash-lite-20260912-status.json`: 0 respostas avaliadas. O modelo de produção não foi trocado.

Preencher a chave somente em `server/.env` ignorado pelo Git; nunca enviar em chat. Executar a partir de `server/`:

```sh
AI_EVAL_LIVE=1 AI_EVAL_MODEL=gemini-3.1-flash-lite AI_EVAL_REPORT=/tmp/linguafire-flash-lite-eval.json npm run eval:ai
```

Repetir com `AI_EVAL_MODEL` igual ao modelo atual confirmado no provedor. O relatório possui 30 casos e campos para revisão pedagógica humana; passar nas checagens automáticas não conclui essa revisão. Nenhuma avaliação real nem chamada paga foi concluída nesta implementação.
