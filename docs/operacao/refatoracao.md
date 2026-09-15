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

Os testes de correspondência de músicas, tradução e Nativos continuam exercitando os módulos através das rotas públicas. Não há migração SQL nesta refatoração. Componentes maiores ainda podem ser subdivididos conforme novos fluxos exigirem, sem mudar contratos de forma indiscriminada.


## Refatoração de 15/09/2026

- `AuthForms.tsx` concentra os formulários; `services/auth.ts`, `profile.ts` e `subscription.ts` separam autenticação, perfil/foto e cobrança.
- `YouTubeFrame.tsx` concentra o ciclo de vida do player; `music-quiz.ts` gera perguntas e `hooks/music-reward.ts` controla o salvamento do resultado.
- `data/native-practice.ts` reúne situações, expressões e recomendações. `services/native-practice.ts` mantém comparação de texto e URL do vídeo; `NativeVideoResult.tsx` apresenta o resultado.
- `LessonCard.tsx` elimina a duplicação dos cartões de lições.
- `styles.css` importa os arquivos de `styles/` na ordem original da cascata. Seletores exclusivos de componentes removidos foram excluídos; regras compartilhadas continuam preservadas.
- `shared/app-levels.json` fornece os limites de XP para cliente e servidor. O Docker copia essa pasta antes do build.
- `utils/public-profile.js` mantém a mesma lista pública no login e na consulta do perfil, incluindo o plano efetivo e o consumo de IA.
- `services/avatar-storage.js` separa armazenamento privado da persistência dos usuários. Ausência de foto é diferente de indisponibilidade do serviço. Falhas de exclusão não retornam sucesso nem encerram a sessão.

### Rascunhos e recompensas

A restauração valida os tipos básicos das atividades. Lições também validam perguntas, alternativas e posição; índices fora do exercício voltam ao início. Essa validação não é um esquema completo para todos os rascunhos.

O quiz só anuncia XP salvo após confirmação. A pendência mantém os valores originais de XP e acertos para repetir a tentativa depois de falha ou recarga. O servidor rejeita uma gravação se esses valores mudaram, impedindo que a mesma tentativa some XP novamente.

Não há recibo durável por quiz nesta entrega. Se o servidor gravar e a resposta se perder, a repetição pode receber conflito. O aluno pode conferir o perfil e escolher “Continuar sem reenviar XP”; isso encerra a pendência sem afirmar que houve crédito e libera um novo quiz. A tentativa nunca é recalculada automaticamente sobre um saldo novo.

### Limpeza e compatibilidade

Foram removidas funções sem consumidores de XP/progresso diário, o verificador de e-mail sem importações e exports de cliente não utilizados. Foram mantidas as rotas de confirmação/recuperação que ainda podem receber links e as operações Stripe consumidas pelo backend. O legado continua acessível; não foi tratado como código morto apenas por ser antigo.

Não há dependência nova nem migração SQL nesta entrega. A exclusão da conta remove a foto antes do registro; se a remoção do registro falhar depois, a conta permanece disponível e pode receber uma nova foto.

### Regressões cobertas

- `client/test/lesson-state.test.mjs`: rascunhos inválidos e índices de perguntas.
- `server/test/account-deletion.test.js`: falhas de exclusão e distinção entre foto ausente e serviço indisponível.
- `server/test/music-reward.test.js`: concorrência e repetição de crédito.
- `server/test/e2e/refactor-recovery.test.js`: recuperação da lição e repetição do salvamento de XP após recarregar, sem sucesso antecipado.

A suíte de navegador foi atualizada para abrir as seções recolhidas de Nativos, Perfil e consumo de IA, respeitando a navegação real.

### Validação final

`npm run release:check` passou em 15/09/2026: build, verificação de sintaxe, 19 testes de cliente, 167 de servidor e 20 de navegador. Os 21 casos ignorados na execução de servidor incluem os testes de navegador, executados em seguida na etapa própria. A validação usa serviços simulados; não confirma produção ou disponibilidade dos provedores.
