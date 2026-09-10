# Sessões, observabilidade e avaliação da IA

## Ativação

1. Execute `migrations/20260910-production-sessions.sql` no SQL Editor do Supabase **antes do deploy**.
2. Todas as instâncias devem usar o mesmo `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `JWT_SECRET`, com HTTPS e a configuração de proxy existente.
3. Publique o backend. O Express passa a usar PostgreSQL via Supabase, sem fallback para memória.

A tabela de sessões só pode ser acessada por `service_role`. IDs são armazenados como SHA-256; dados da sessão ficam em JSONB. O cookie expira em 24 horas; sessões expiradas são recusadas e removidas de hora em hora. Sessões antigas em memória não são migradas: um fluxo OAuth em andamento pode precisar ser reiniciado. A autenticação principal por JWT continua independente desse armazenamento.

Em homologação, valide login Google, reinício do servidor, continuidade em outra instância e logout. Os testes automatizados usam um banco simulado compartilhado; não substituem essa validação real nem um teste de carga. Limites de requisição e contadores de monitoramento ainda são locais por instância; esta mudança não torna todo o sistema distribuído.

## Logs

Cada linha é JSON com timestamp, level, service, message, metadata e requestId quando houver requisição. O cliente recebe `X-Request-ID`. Rotas usam o padrão cadastrado, sem query strings. Chamadas de IA registram modelo, duração, inputUnits/outputUnits (tokens reportados pelo provedor), status e falhas; não registram prompts ou respostas.

Os logs vão para stdout/stderr, capturados pelo Render. `LOG_HTTP_REQUESTS=false` desliga apenas logs HTTP de sucesso; erros e lentidão continuam visíveis. Para histórico centralizado, configure um destino de logs no provedor. Não foi criada uma conta DataDog nem alertas externos. Sugestão operacional: acompanhar taxa de 5xx, p95 de duração, erros 429/5xx da IA e custo por modelo. O painel de monitoramento existente continua sendo por processo.

## Qualidade da IA

`npm test` inclui testes determinísticos das regras de avaliação e dos contratos existentes. Para medir o modelo real:

```sh
cd server
AI_EVAL_LIVE=1 npm run eval:ai
```

Usa `GEMINI_API_KEY` e `GEMINI_MODEL` do ambiente; faz até 20 chamadas pagas, com dados sintéticos, e gera `/tmp/linguafire-ai-eval.json` (ou `AI_EVAL_REPORT`). Falhas de provedor interrompem a execução. Código de saída diferente de zero significa caso reprovado ou execução incompleta.

São cinco cenários, cada um com frase correta, erro gramatical, linguagem informal e tentativa de fuga de contexto. Os critérios verificam correções indevidas, correção esperada, pergunta de continuidade e manutenção de contexto. São heurísticas: paráfrases válidas podem reprovar e uma resposta pedagogicamente ruim pode passar. Revise o relatório manualmente para preservação de sentido, adequação ao nível, precisão da explicação e naturalidade antes de mudar modelo ou prompt. Os cenários de Nativos têm testes de contrato separados; a suíte de 20 casos avalia conversa, não todos os recursos de IA.

Para entrevista: esta implementação demonstra persistência compartilhada, falha fechada, rastreabilidade sem guardar conversas e avaliação reproduzível. Não afirme capacidade para 100 usuários simultâneos ou precisão pedagógica garantida sem medições de carga e revisão humana.
