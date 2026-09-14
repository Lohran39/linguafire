# Redis, observabilidade e avaliação da IA

[Índice da documentação](../README.md)

## Ativação

1. Execute `server/migrations/20260910-product-usage.sql` no SQL Editor do Supabase **antes do deploy**.
2. Configure `REDIS_URL` com a conexão interna do Render Key Value na mesma região do serviço. Todas as instâncias devem usar o mesmo Redis e `JWT_SECRET`, além das credenciais Supabase já existentes. Não exponha Redis publicamente.
3. Publique o backend. Em produção, Redis é obrigatório: sem URL ou conexão inicial, o servidor não inicia. `/readyz` retorna 503 quando Redis está indisponível. Configure esse caminho no health check do Render.

Redis usa `connect-redis`, prefixo `linguafire:session:` e TTL de 24 horas, renovado nas interações. Não há fallback para memória em produção. Escolha `noeviction` para não remover silenciosamente sessões válidas quando a memória encher. O piloto gratuito do Render Key Value não persiste dados em reinícios; use plano com persistência para operação durável. Sessões antigas não são migradas: um fluxo OAuth em andamento pode precisar ser reiniciado. A autenticação principal por JWT continua independente desse armazenamento.

O store PostgreSQL anterior foi mantido somente para desenvolvimento sem REDIS_URL; nesse caso, execute `server/migrations/20260910-production-sessions.sql`. Essa tabela não é necessária para produção com Redis.

Em homologação, valide login Google, reinício do servidor, continuidade em outra instância e logout. Os testes automatizados usam clientes simulados compartilhando dados; não substituem essa validação real nem um teste de carga. Os limites de requisição passaram a usar Redis em produção, conforme o [guia de segurança](seguranca-autenticacao.md). Os contadores de monitoramento em memória continuam locais por instância.

## Logs

Cada linha é JSON com timestamp, level, service, message, metadata e requestId quando houver requisição. O cliente recebe `X-Request-ID`. Rotas usam o padrão cadastrado, sem query strings. Chamadas de IA registram modelo, duração, inputUnits/outputUnits (tokens reportados pelo provedor), status e falhas; não registram prompts ou respostas.

Os logs vão para stdout/stderr, capturados pelo Render. `LOG_HTTP_REQUESTS=false` desliga apenas logs HTTP de sucesso; erros e lentidão continuam visíveis. Para histórico centralizado, configure um destino de logs no provedor. Não foi criada uma conta DataDog nem alertas externos. Sugestão operacional: acompanhar taxa de 5xx, p95 de duração, erros 429/5xx da IA e custo por modelo. O painel de monitoramento existente continua sendo por processo.

## Qualidade da IA

`npm test` inclui testes determinísticos das regras de avaliação e dos contratos existentes. Para medir o modelo real:

```sh
cd server
AI_EVAL_LIVE=1 npm run eval:ai
```

Usa `GEMINI_API_KEY` e `GEMINI_MODEL` do ambiente; executa 36 casos sintéticos, com possíveis chamadas adicionais pelas tentativas do provedor, e gera `/tmp/linguafire-ai-eval.json` (ou `AI_EVAL_REPORT`). Falhas de provedor interrompem a execução. Código de saída diferente de zero significa caso reprovado ou execução incompleta.

São cinco cenários, cada um com frase correta, erro gramatical, linguagem informal e tentativa de fuga de contexto, além de casos pedagógicos e conversas com histórico. Os critérios verificam correções indevidas, correção esperada, pergunta de continuidade e manutenção de contexto. São heurísticas: paráfrases válidas podem reprovar e uma resposta pedagogicamente ruim pode passar. Revise o relatório manualmente para preservação de sentido, adequação ao nível, precisão da explicação e naturalidade antes de mudar modelo ou prompt. Os cenários de Nativos têm testes de contrato separados; a suíte avalia conversa, não todos os recursos de IA. Consulte o [roteiro de avaliação](../piloto/roteiro.md#revisão-pedagógica).

Para entrevista: esta implementação demonstra persistência compartilhada, falha fechada, rastreabilidade sem guardar conversas e avaliação reproduzível. Não afirme capacidade para 100 usuários simultâneos ou precisão pedagógica garantida sem medições de carga e revisão humana.

## Medição com alunos

O Admin inclui ativos diários, ativos em 28 dias, D1/D7 por primeiro uso observado e usuários por funcionalidade. A coleta ignora administradores e deduplica por conta, dia UTC e aba; não registra texto de conversa. Veja [roteiro](../piloto/roteiro.md) para conduzir o piloto e interpretar as métricas. A instrumentação não substitui recrutar participantes e acompanhar o uso real.

## Avaliação real de 10/09/2026

A primeira execução completou 9 respostas, todas reprovadas por truncamento, e parou na décima solicitação com HTTP 429. Foi ampliado o orçamento de saída da conversa, ativado o modo de menor latência e adicionada rejeição de `MAX_TOKENS`. A reavaliação parou na primeira solicitação com HTTP 504. Portanto, **a qualidade do modelo após a correção ainda não foi aprovada**. Testes locais confirmam os contratos e a rejeição de respostas truncadas, não a qualidade pedagógica do provedor.
