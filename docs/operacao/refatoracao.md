# Manutenção e organização dos módulos

## Responsabilidades

- `client/src/services/activity-drafts.ts`: contratos das atividades, validação de respostas, leitura do cache e conciliação de revisões. As regras de comparação e conciliação são funções independentes de React.
- `client/src/hooks/activity-progress.tsx`: estado de interface, agendamento, eventos do navegador e persistência dos rascunhos. Usa o serviço para ler e salvar atividades.
- `server/routes/activity-routes.js`: autenticação, validação da gravação e atualização condicional da revisão no banco.

## Música e Nativos

- `server/services/provider-http.js`: leitura de respostas dos provedores com limite de tempo.
- `server/services/lyrics-translation.js`: fila de tradução, divisão em lotes, cache e fallback entre DeepL e MyMemory.
- `server/services/music-catalog.js`: correspondência de artista/letra, busca de vídeos e validação de duração e versões.
- `server/services/native-catalog.js`: busca, pontuação, filtros e regras de cache dos vídeos de Nativos.
- `server/services/native-coach.js`: orientações por situação/nível e validação da resposta estruturada da IA.

As rotas de músicas e Nativos mantêm os endpoints, a autenticação e a orquestração. As exportações anteriores foram preservadas para compatibilidade com os testes e demais consumidores. Não houve troca de provedores nem mudança intencional dos critérios de seleção.

## Garantias

- Alterar a ordem das propriedades de um objeto não cria um conflito; a ordem de listas continua relevante.
- Um cache inválido não vira uma gravação na conta. Respostas inválidas da API não são tratadas como confirmação de salvamento.
- Rascunhos offline com a revisão esperada continuam pendentes. Conflitos de respostas preservam a versão da conta e arquivam a cópia local antes de descartá-la da fila.
- A navegação pode atualizar sua revisão sem sobrescrever respostas de exercícios.
- A recuperação mantém o comportamento sem aviso de conflito ou download.

## Verificação

`npm run verify` executa build, sintaxe e testes unitários/integração. Os casos de cache inválido, conflito, ordem de campos e confirmação de revisão estão em `client/test/activity-drafts.test.mjs`.

Os testes de navegador precisam de `RUN_PLAYWRIGHT_E2E=1`; os fluxos relevantes estão em `server/test/e2e/activity-resume.test.js`, `lyrics-sync.test.js`, `profile.test.js` e `subscription-management.test.js`. Eles usam APIs simuladas, sem comprovar a disponibilidade dos provedores de produção.

Os testes de correspondência de músicas, tradução e Nativos continuam exercitando os módulos através das rotas públicas. Não há migração SQL nesta refatoração. Os componentes de interface de Música e Nativos ainda podem ser subdivididos em trabalhos posteriores; esta entrega separa seus serviços no backend.
