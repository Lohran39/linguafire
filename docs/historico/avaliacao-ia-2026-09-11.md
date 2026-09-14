# Avaliação da IA — 11/09/2026

[Índice da documentação](../README.md)

> Registro histórico desta rodada de avaliação. Consulte o [roteiro do piloto](../piloto/roteiro.md) para a suíte de avaliação documentada mais recentemente.

Status: preparação e testes dos critérios concluídos; avaliação do modelo real pendente.

## Evidência

- 30 casos preparados: 20 cenários existentes e 10 casos pedagógicos adicionais.
- 11 testes passaram em `node --test server/test/ai-evaluation.test.js server/test/production-foundations.test.js` (caminhos a partir da raiz).
- Verificação de sintaxe: 66 arquivos, nenhuma falha.
- Nenhuma chamada real realizada e nenhuma resposta do modelo avaliada nesta rodada.
- O arquivo local `server/.env` está marcado como `dataless` pelo macOS e sua leitura não retorna conteúdo. Solicitar download pelo iCloud não resolveu até a última verificação.

## Mudanças

Os critérios passam a detectar algumas correções fora de “Quick correction” e a aceitar apóstrofos tipográficos. Os novos casos verificam negação, quantidade, tempo verbal, dialeto, gírias, elipse e ambiguidades. O relatório inclui entrada sintética, expectativa, orientação pedagógica, tokens e duração, separando erro do provedor de resposta recebida. A aprovação pedagógica permanece pendente até a leitura das respostas.

## Próxima etapa

Restaurar a configuração local e executar `AI_EVAL_LIVE=1 npm run eval:ai` a partir de `server`. Revisar correção necessária, sentido preservado, explicação correta, nível e naturalidade em cada resposta. A suíte não substitui revisão por professor nem valida todas as atividades: o escopo atual é a conversa dos cinco cenários, sem cobertura específica de B2 ou múltiplos turnos.
