# Confirmação de e-mail e proteção de acesso

## Fluxo

1. Cadastro com senha cria uma conta pendente; não emite sessão.
2. O link enviado vale 24 horas. Abrir o link não ativa a conta: leitores automáticos de e-mail não podem consumi-lo.
3. O dono do e-mail define a senha final na confirmação, substituindo qualquer senha de um cadastro feito por outra pessoa. Pode repetir a senha do cadastro.
4. Depois de confirmar, entra com e-mail e senha. Links expirados têm orientação para reenvio na tela de login.
5. Reenvio tem espera de 60 segundos, compartilhada com cadastro e recuperação. Falha de envio tenta restaurar o link anterior com atualização condicional.

Google exige e-mail verificado pelo provedor e estado OAuth ligado à sessão, válido por 10 minutos e utilizável uma vez. Contas pendentes precisam finalizar confirmação antes da vinculação Google; não herdamos uma senha escolhida por terceiros.

## Proteções

- Login e sessão exigem `email_verified = 1`; ausência do campo não libera acesso.
- Redis compartilha limites por IP e e-mail entre instâncias. Indisponibilidade bloqueia temporariamente as rotas limitadas com 503.
- E-mails e IPs não ficam em texto nas chaves do limiter. Login: 10 tentativas/IP/minuto e 10/e-mail/15 minutos. Reenvio: 3/IP/minuto, 1/e-mail/minuto.
- Banco armazena somente SHA-256 dos tokens. Confirmação/reset consomem token e expiração na mesma atualização condicional. Token já usado não pode alterar a conta novamente.
- `auth_version` invalida sessões após recuperação/troca de senha. Troca autenticada mantém apenas a sessão que fez a alteração.
- MX verifica apenas o domínio; a caixa postal é comprovada pela confirmação. Senhas continuam usando bcrypt.

## Publicação

1. Em janela de manutenção dos cadastros, executar `migrations/20260913-auth-hardening.sql` no Supabase e publicar este código em seguida. A primeira execução invalida links antigos em texto; usuários precisam solicitar novos links. Não rodar a migração com a versão antiga recebendo cadastros.
2. Conferir `BASE_URL` com a URL HTTPS pública, Redis e o serviço de envio já suportado (Resend com remetente validado ou SMTP). Nunca publicar links de desenvolvimento; `NODE_ENV=production` impede esses links nas respostas.
3. Testar com uma caixa real: cadastro, recebimento, confirmação, login, reenvio, expiração e recuperação. Os testes automatizados usam provedores simulados e não comprovam entrega de e-mail em produção.

Contas existentes com `email_verified=1` são preservadas. Não existe evidência suficiente para afirmar que todos esses endereços foram confirmados no passado. Uma campanha de reconfirmação de contas antigas precisa ser planejada separadamente para evitar bloqueio em massa.

## Validação local

`npm run build`

`node --test server/test/auth-routes.test.js server/test/auth-hardening.test.js server/test/auth-token-storage.test.js server/test/google-auth-security.test.js`

`RUN_PLAYWRIGHT_E2E=1 node --test server/test/e2e/email-confirmation.test.js`

Nenhum e-mail real é enviado por esses testes.

Validação desta entrega: build e verificação de sintaxe aprovados; suíte geral com 12 testes do frontend e 154 do backend aprovados (18 testes opcionais ignorados); teste Playwright de confirmação em celular aprovado. Migração executada duas vezes em PostgreSQL temporário, preservando contas confirmadas, invalidando links antigos e mantendo novos cadastros pendentes. Três expectativas antigas de limite Max foram atualizadas de 1000 para 150, sem alteração de cobrança.
