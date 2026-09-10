# LinguaFire

Plataforma gamificada de ingles. A interface principal foi migrada para React + TypeScript em `client/`; o app legado continua disponivel em `/legacy/index.html` para compatibilidade.

## Status atual do projeto

Atualizado em 2026-08-28.

O projeto ja foi preparado para rodar em producao no Render usando React + Vite no frontend e Node/Express no backend.

### Ja foi feito

- Frontend principal em React + TypeScript, servido pela raiz `/`.
- App legado preservado em `/legacy/index.html` para compatibilidade.
- Build de producao com Vite configurado.
- Deploy no Render configurado por `render.yaml`.
- Plano do Render ajustado para `free`.
- Health check em `/health` mostrando status do backend, provider de IA e frontend ativo.
- Supabase configurado como banco principal do backend.
- Migration SQL criada em `server/supabase-migration.sql`.
- Variaveis de ambiente documentadas em `server/.env.example`.
- Gemini configurado como provider de IA no lugar do Minimax.
- Rotas de conversa e gramatica usando o gateway Gemini configurado no backend.
- Login normal com email/senha.
- Cadastro com validacao de email real/dominio valido.
- Cadastro e login com Google adicionados na interface.
- Google OAuth integrado no backend com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
- Botao "Entrar com Google" com logo oficial do Google em SVG.
- Tela inicial abrindo primeiro na raiz do site; login aparece depois de clicar em "Comecar agora".
- Tela de login redesenhada no estilo visual solicitado.
- Tela inicial redesenhada no estilo LinguaFire com bandeiras, mapa-mundi pontilhado e cards.
- Bandeira dos Estados Unidos substituida por asset original em SVG.
- Dashboard com fundo visual aplicado nas telas internas.
- Saudacao da dashboard usando o nome do usuario logado.
- Ajustes responsivos para celular, tablet, notebook e desktop.
- Correcoes especificas para a splash/login no celular, evitando corte lateral do logo e dos avisos.
- Fundos pesados convertidos de PNG para WebP.
- Preload ajustado para priorizar splash/login e evitar carregar imagens internas antes da hora.
- Assets otimizados para melhorar velocidade de abertura no celular.
- CI configurado em `.github/workflows/ci.yml` com verificacoes de release.
- Testes unitarios, smoke e E2E documentados.
- Fluxo de deploy via GitHub: `git add`, `git commit` e `git push origin main`.

### Ultimos ajustes visuais

- Mapa-mundi pontilhado aplicado na tela inicial.
- Frase principal corrigida para: "Aprenda ingles com musica, contexto real e pratica diaria."
- Tela inicial voltou a abrir antes do login.
- Splash mobile ajustada para nao cortar o logo `LinguaFire`.
- Login e splash ficaram mais leves para carregar.

### O que ainda falta revisar antes de considerar finalizado

- Confirmar no Render se todas as variaveis de ambiente de producao estao preenchidas com valores reais.
- Rodar a migration no Supabase se ainda nao foi aplicada.
- Conferir se Google OAuth tem o redirect autorizado correto:
  `https://linguafire.onrender.com/auth/google/callback`.
- Configurar SMTP real se quiser recuperacao de senha por email.
- Configurar Stripe se a assinatura paga for entrar em producao.
- Testar cadastro, login, Google OAuth, conversa com IA, flashcards, musica, nativos, loja e perfil em celular real.
- Fazer limpeza final do app legado apenas depois de confirmar que tudo foi migrado para React.

## Desenvolvimento

Use Node.js 22 atualizado ou 24. Os testes do cliente usam o suporte nativo a TypeScript (`--experimental-strip-types`).

Instale dependencias na raiz, no client e no servidor:

```sh
npm install
npm --prefix client install
npm --prefix server install
```

Rode o frontend React com Vite:

```sh
npm run dev:client
```

Por padrao, o Vite abre em `http://127.0.0.1:5173/` e faz proxy das rotas de API para `http://127.0.0.1:3000`.

Rode o backend em outro terminal:

```sh
npm run dev:server
```

## Build e producao

O build React e obrigatorio em producao:

```sh
npm run build
NODE_ENV=production npm start
```

Se `NODE_ENV=production` e `client/dist/index.html` nao existir, o servidor falha explicitamente. Em desenvolvimento/teste, o servidor ainda pode cair para `public/dist` para preservar o legado.

Para publicar no Render, use `render.yaml` como blueprint. Para container, use o `Dockerfile` na raiz.

O endpoint `/health` informa o frontend ativo:

```json
{
  "ok": true,
  "frontend": "react"
}
```

## Testes

```sh
npm run check
npm test
npm run test:e2e
```

- `check` verifica individualmente a sintaxe de todos os arquivos JavaScript do servidor, incluindo subpastas e testes, sem executar o codigo.
- `test` executa os testes do cliente e do servidor. Os testes de traducao simulam os provedores e verificam cache, fallback e divisao em lotes, sem consumir quota externa.
- `test:e2e` exige o build React e o Chromium do Playwright instalado (`npm --prefix server exec -- playwright install chromium`). A execucao precisa de permissao para abrir um servidor local e o navegador.

Para uma verificacao completa antes de publicar:

```sh
npm run release:check
```

O e2e cobre as abas React principais em desktop/mobile e mantem um teste separado do legado em `/legacy/index.html`.

O workflow `.github/workflows/ci.yml` roda o mesmo `release:check` em push e pull request.

## Organizacao do codigo

- `client/src/`: interface React, dados e servicos usados pelo app principal.
- `client/src/services/http.ts`: tratamento comum de respostas JSON e erros HTTP; respostas invalidas nao sao tratadas como sucesso.
- `server/routes/`: endpoints da plataforma.
- `server/services/gemini-service.js`: adaptador da IA de conversa e treino, com timeouts e tentativas limitadas.
- `server/routes/lyrics-routes.js`: busca de letras e traducao; DeepL, quando configurado, seguido de MyMemory. Gemini nao participa da traducao de letras.
- `public/dist/`: app legado ainda servido em `/legacy/index.html`; nao confundir com arquivos descartaveis de build.

Prototipos sem referencias em `src/` e `public/extracted_project/`, o pacote duplicado em `server/server/` e o middleware de autenticacao sem uso foram removidos. A autenticacao ativa continua em `server/index.js`.

### Carregamento e desempenho

As abas React sao carregadas sob demanda, com estados de espera e erro que preservam a navegacao. Na musica, video, letra original e traducao nao bloqueiam a exibicao uns dos outros. A traducao continua usando os provedores existentes, sem Gemini.

Trocar de musica ou sair da aba cancela as requisicoes do navegador e ignora respostas antigas. Buscas e letras tem timeout de 20 segundos por requisicao; traducao, 30 segundos por lote. Uma falha na traducao preserva a letra e permite tentar novamente sem repetir a busca da letra. Isso nao garante disponibilidade ou velocidade dos provedores externos, nem cancela trabalho ja iniciado no servidor.

Os tempos HTTP ficam apenas no navegador, em medidas `linguafire:music:video-search`, `video-metadata`, `lyrics` e `translation`. Cada etapa guarda ate 30 medidas com duracao e resultado (`success`, `error`, `timeout`, `cancelled`), sem incluir letras, buscas ou identificadores nas medidas e sem envia-las a terceiros. Para inspecionar no console:

```js
performance.getEntriesByType('measure').filter(entry => entry.name.startsWith('linguafire:music:'))
```

Os E2E cobrem letras disponiveis antes da traducao, cancelamento de buscas antigas, nova tentativa de traducao e falha no carregamento de uma aba em desktop e celular.

## Variaveis de ambiente

Use `server/.env.example` como base. Para producao, configure pelo menos:

- `NODE_ENV=production`
- `BASE_URL=https://seudominio.com`
- `CORS_ORIGINS=https://seudominio.com`
- `JWT_SECRET` forte
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Opcionais conforme features:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SMTP_*`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `NATIVE_COACH_FALLBACK_MODEL` (opcional; padrao `gemini-3.1-flash-lite`)
- `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_MAX_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- `NATIVES_ADMIN_TOKEN`
- `LYRICS_ADMIN_TOKEN`
- `AGENT_ADMIN_TOKEN`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_ADMIN_TOKEN`

### Treino de Nativos

O treino envia ate 10 interacoes anteriores do exercicio atual e aceita ate 1000 caracteres por resposta. Trocar de exercicio, reiniciar ou sair da aba limpa esse historico e cancela a chamada pendente.

A chamada usa JSON estruturado, ate 2048 tokens de saida e um prazo total de 25 segundos. Cada tentativa tem 10 segundos; em falha temporaria ou timeout, a segunda usa `NATIVE_COACH_FALLBACK_MODEL` com a mesma chave Gemini. Uma variavel vazia desativa a troca de modelo. Erros de quota (429) nao sao repetidos automaticamente. Cada envio passa uma vez pelo limite de uso da plataforma, mesmo quando a chamada interna exige uma segunda tentativa.

Falhas preservam o texto digitado e permitem tentar novamente. Respostas invalidas nao geram nota ou progresso. A disponibilidade e as quotas dos modelos continuam dependentes do provedor. Referencias: [JSON estruturado](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) e [Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).

Teste local sem consumir IA: `node --test server/test/native-coach.test.js server/test/gemini-service.test.js`.
Teste real opcional (consome a quota da chave local): `NATIVE_COACH_LIVE=1 node --test server/test/native-coach.test.js`.

## Assinaturas

Em producao, `/api/subscription/create` cria uma Stripe Checkout Session quando `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID` e `STRIPE_MAX_PRICE_ID` estao definidos. Configure o webhook da Stripe para `https://seudominio.com/api/subscription/webhook` e preencha `STRIPE_WEBHOOK_SECRET`.

`ALLOW_FAKE_SUBSCRIPTIONS=true` existe apenas para demo/desenvolvimento. Nao use em producao com usuarios reais.

## Push

As notificacoes usam `web-push`. Gere VAPID keys com:

```sh
npx web-push generate-vapid-keys
```

Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`. O endpoint `/api/push/broadcast` exige `PUSH_ADMIN_TOKEN`.

## Legado

- Entrada principal: React em `/`.
- Compatibilidade: legado em `/legacy/index.html`.
- Arquivos estaticos antigos ainda sao servidos como fallback para assets do legado.

Antes de remover o legado, confirme que todo o conteudo de `public/dist/lesson-module.js` foi migrado para `client/src/data/lessons.ts`.


### Retomada de atividades e navegação móvel

Antes de publicar esta versão em um banco existente, execute
`server/migrations/20260908-activity-progress.sql` no SQL Editor do Supabase.
Instalações novas já incluem a tabela em `server/supabase-migration.sql`.
A tabela tem RLS e só é acessada pelo servidor autenticado, usando o ID da sessão.

Lições, flashcards, conversa, música (quiz e posição do vídeo), Nativos e nivelamento
salvam a atividade em andamento na conta. A navegação também é restaurada.
O aviso “Salvo na conta” confirma que outro dispositivo já pode continuar.
Rascunhos pendentes ficam no armazenamento local separado por usuário e são reenviados
quando a conexão volta. O botão Sair aguarda a sincronização antes de encerrar a conta.
Um conflito de revisão não sobrescreve o outro dispositivo: a interface oferece uma
cópia JSON local antes de carregar a versão da conta. Apenas o estado atual é mantido,
sem histórico de versões; encerrar a conversa limpa suas mensagens do rascunho.
Não é possível retomar uma requisição de IA já interrompida: o texto fica disponível
para reenvio explícito. Os testes usam provedores e persistência simulados, sem cobrar IA.

No celular, Início, Lições, Revisão e Conversar ficam visíveis; “Mais” reúne as outras
opções. Há foco visível, link para pular a navegação, botões de pelo menos 44 px,
contraste ajustado e suporte a redução de movimento.

Validação específica: `RUN_PLAYWRIGHT_E2E=1 node --test server/test/e2e/activity-resume.test.js`.


### Aprendizado além do XP e curadoria de conteúdo

Para um banco existente, execute `server/migrations/20260909-learning-curation.sql`
no SQL Editor do Supabase e publique o cliente e o servidor atualizados. O script
completo `server/supabase-migration.sql` também inclui estas tabelas para instalações novas.

A página inicial distingue **nível de jogo (XP)** de **nível de inglês (nivelamento)**.
Palavras consolidadas exigem pelo menos 3 revisões bem avaliadas e intervalo de 7 dias;
correções de frases são excluídas dessa contagem de vocabulário. Erros recorrentes
agrupam os registros das análises de conversa. As habilidades usam apenas resultados
registrados a partir desta versão: lições, autoavaliação dos flashcards, quiz de letras,
avaliação escrita do coach e ditado. A comparação usa 14 dias contra os 14 anteriores,
com mínimo de 5 respostas em cada período para mostrar variação. Sem evidências, a
interface mostra “Sem dados”, sem inferir proficiência a partir do XP.

`learning_events` guarda somente ID da tentativa, atividade, nota e data, vinculados
à conta. O ID impede duplicação no reenvio. O cliente mantém resultados pendentes
por usuário e tenta enviá-los no próximo exercício ou ao abrir o início.

Músicas e vídeos de Nativos exibem estado de revisão e disponibilidade da tradução.
Os alunos podem informar vídeo errado, texto incorreto, tradução, indisponibilidade
ou outro problema; falhas no envio permanecem visíveis e permitem tentar novamente.
Na aba **Admin** (em **Mais** no celular), a ficha de curadoria exige confirmação de
vídeo e texto e classificação da tradução. A aprovação atualiza as sugestões;
a reprovação remove o vídeo das sugestões daquele conteúdo. Denúncias posteriores
à revisão retiram a prioridade de verificado até nova avaliação. A fila mostra até
100 denúncias antigas, sem expor e-mail ou ID do denunciante. Acesso de aprovação
é validado pelo papel do usuário consultado no banco.

Não há aprovação automática baseada apenas na reprodução de um vídeo. Os selos
novos dependem de revisão humana; a curadoria anterior de Nativos continua utilizável.
Testes: `node --test server/test/learning-curation.test.js` e
`RUN_PLAYWRIGHT_E2E=1 node --test server/test/e2e/learning-curation.test.js`.

### Gestão de assinatura e consumo de IA

Antes de publicar esta versão, execute `server/migrations/20260909-subscription-management.sql` no SQL Editor do Supabase. Instalações novas podem usar `server/supabase-migration.sql`, que já inclui a migração. A função `consume_ai_use` conta solicitações atomicamente; sem ela as chamadas de IA retornam indisponibilidade. O limite diário renova às 00:00 UTC, mostrado na tela no fuso do aluno. Free: 10, Pro: 300, Max: 1000 usos/dia. Solicitações admitidas consomem um uso, inclusive se o provedor falhar.

Configure no servidor `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_MAX_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` e `BASE_URL` (endereço público do aplicativo). Os preços devem ser recorrentes mensais em BRL, Pro R$45 e Max R$85. Use IDs diferentes para os dois planos. `STRIPE_PRICE_ID` continua aceito como alternativa para o Pro. As chaves e os preços precisam pertencer ao mesmo ambiente Stripe (teste ou produção).

No [portal do cliente Stripe](https://dashboard.stripe.com/settings/billing/portal), habilite histórico de faturas, atualização de métodos de pagamento, troca de assinatura e cancelamento no fim do período. Inclua os produtos e preços Pro/Max no catálogo de troca de plano; configure a cobrança proporcional conforme sua política comercial. Salve a configuração padrão ou informe seu ID em `STRIPE_PORTAL_CONFIGURATION_ID`. Consulte a [documentação do portal](https://docs.stripe.com/customer-management/integrate-customer-portal) para as opções disponíveis. A aplicação cria sessões autenticadas para o cliente vinculado à conta, sem aceitar identificadores de cliente enviados pelo navegador.

Registre o endpoint público `POST /api/subscription/webhook` para os eventos:

- `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`;
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`;
- `invoice.paid`, `invoice.payment_failed`.

O servidor verifica a assinatura do webhook e consulta o estado atual na Stripe. O preço efetivo determina o plano; metadados antigos não concedem acesso. Alterações pelo portal e renovações atualizam o período real contratado. Cancelar a renovação mantém acesso até o fim desse período; assinaturas vencidas, não pagas ou pausadas usam a cota Free. Falhas de sincronização retornam erro para a Stripe reenviar o evento. O perfil também reconcilia a assinatura ao abrir a tela, voltar do portal e atualizar os dados.

Validação antes de liberar pagamentos: em modo de teste Stripe, contratar Pro, trocar para Max, consultar uma fatura, atualizar cartão, cancelar a renovação e voltar ao perfil. Confirme recebimento dos webhooks e manutenção do acesso até o fim do período. Os testes automatizados usam respostas simuladas; não efetuam cobranças reais. Ativações simuladas locais exigem `ALLOW_FAKE_SUBSCRIPTIONS=true` e são bloqueadas em produção.
