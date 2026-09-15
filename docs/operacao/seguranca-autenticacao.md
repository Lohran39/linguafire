# Cadastro e proteção de acesso

[Índice da documentação](../README.md)

## Fluxo

1. Cadastro com nome, e-mail e senha cria uma conta ativa e inicia a sessão imediatamente.
2. O cadastro atual não envia nem exige confirmação de e-mail.
3. A senha é armazenada somente como hash. Formato dos campos e limites de tentativas permanecem ativos.
4. Contas antigas pendentes podem entrar se apresentarem a senha correta.

Google exige e-mail verificado pelo provedor e estado OAuth ligado à sessão, válido por 10 minutos e utilizável uma vez. Cadastros pendentes com Gmail ou domínio Workspace confirmado pelo Google podem ser concluídos pelo OAuth. Uma atualização condicional marca a conta como verificada, vincula o Google, remove senha e tokens anteriores e invalida sessões antigas antes de emitir a sessão nova. O progresso é preservado. E-mails externos sem autoridade do Google continuam exigindo confirmação; não basta confiar no domínio digitado pelo usuário.

A interface de cadastro oferece somente nome, e-mail e senha. “Criar conta com Google” foi removido; “Entrar com Google” permanece na tela de login para contas que já usam esse acesso. Links antigos de confirmação continuam reconhecidos por compatibilidade.

Consequência aceita nesta fase: uma pessoa pode cadastrar um endereço que não controla ou que não existe. Recuperação de senha depende de envio de e-mail e poderá ficar indisponível enquanto o provedor não estiver configurado para todos. Quando houver remetente verificado, a confirmação deve voltar antes de tratar `email_verified` como evidência real.

Não exige SQL novo: usa as colunas da migração de autenticação existente. A validação automatizada usa identidades Google simuladas; o login real do aluno deve ser conferido após o deploy.

## Proteções

- Novos cadastros usam `email_verified = 1` apenas como estado interno de compatibilidade. Esse valor não comprova que a caixa de e-mail existe.
- Redis compartilha limites por IP e e-mail entre instâncias. Indisponibilidade bloqueia temporariamente as rotas limitadas com 503.
- E-mails e IPs não ficam em texto nas chaves do limiter. Login: 10 tentativas/IP/minuto e 10/e-mail/15 minutos. Reenvio: 3/IP/minuto, 1/e-mail/minuto.
- Banco armazena somente SHA-256 dos tokens. Confirmação/reset consomem token e expiração na mesma atualização condicional. Token já usado não pode alterar a conta novamente.
- `auth_version` invalida sessões após recuperação/troca de senha. Troca autenticada mantém apenas a sessão que fez a alteração.
- Senhas continuam usando bcrypt. O cadastro não verifica entrega nem existência da caixa postal nesta fase.

## Publicação

1. Não há nova migração SQL. A migração de segurança existente continua necessária para tokens e invalidação de sessões.
2. Conferir cadastro, entrada imediata, login posterior e rejeição de senha incorreta. O cadastro não depende de Resend ou SMTP.
3. Recuperação de senha e links antigos continuam dependendo do serviço de envio. Testá-los separadamente quando houver remetente disponível para todos.

Contas existentes com `email_verified=1` são preservadas. Não existe evidência suficiente para afirmar que todos esses endereços foram confirmados no passado. Uma campanha de reconfirmação de contas antigas precisa ser planejada separadamente para evitar bloqueio em massa.

## Validação local

`npm run build`

`node --test server/test/auth-routes.test.js server/test/auth-hardening.test.js server/test/auth-token-storage.test.js server/test/google-auth-security.test.js`

`RUN_PLAYWRIGHT_E2E=1 node --test server/test/e2e/email-confirmation.test.js`

Nenhum e-mail real é enviado por esses testes.

Validação desta entrega: build e verificação de sintaxe aprovados; suíte geral com 12 testes do frontend e 154 do backend aprovados (18 testes opcionais ignorados); teste Playwright de confirmação em celular aprovado. Migração executada duas vezes em PostgreSQL temporário, preservando contas confirmadas, invalidando links antigos e mantendo novos cadastros pendentes. Três expectativas antigas de limite Max foram atualizadas de 1000 para 150, sem alteração de cobrança.
