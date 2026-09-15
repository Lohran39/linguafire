# Perfil

O Perfil reúne identificação, resumo de estudo e configurações sem abrir todos os formulários ao mesmo tempo.

- Cabeçalho: nome, e-mail e nível de inglês do nivelamento. Sem nivelamento, mostra “Descobrir meu nível”.
- Resumo: lições concluídas, dias de sequência e XP de participação.
- Assinatura: plano, renovação quando disponível e usos restantes de IA. Consumo detalhado e contratação ficam em “Detalhes do plano e consumo”. O cliente com cobrança pode abrir “Gerenciar plano”.
- Seções recolhidas: Meus dados, Aparência, Notificações, Segurança e Excluir conta.
- O nome tem salvamento explícito. O tema salva ao selecionar e volta ao anterior caso a gravação falhe. Cada seção exibe seu próprio aviso.
- Contas vinculadas mostram “Google conectado”. Contas sem senha podem solicitar um link por e-mail para criar uma, usando o fluxo existente de recuperação e prova de acesso ao e-mail. Isso depende de envio de e-mail configurado; Resend em modo teste não atende todos os destinatários.
- A exclusão exige digitar o e-mail da conta. O botão permanece desabilitado até a confirmação corresponder.

## Segurança e validação

`GET /api/profile` usa uma lista explícita de campos públicos em `server/utils/public-profile.js`. Hash de senha, tokens de confirmação/recuperação, identificador Google e campos internos de cobrança não são retornados. `has_password` informa apenas se há senha cadastrada.

Validação local: build TypeScript/Vite, testes de privacidade da rota, tokens de uso único e segurança Google; testes de navegador com APIs simuladas cobrem edição, falha de tema, aviso de senha, criação de senha por e-mail e portal de cobrança. Layout conferido em larguras de 320, 390 e 1280 pixels.

Não exige nova migração SQL. Os testes com respostas simuladas não comprovam envio real de e-mail nem configuração de cobrança em produção.


## Foto e exclusão

A foto pode ser escolhida e removida no perfil. O navegador recorta e reduz a imagem antes do envio; o servidor valida formato e tamanho e salva em bucket privado do Supabase. A leitura autenticada não usa cache persistente no navegador, evitando apresentar uma foto removida após recarga.

Falhas no armazenamento ou no banco durante a exclusão não são apresentadas como sucesso. A sessão é mantida para permitir nova tentativa. A ausência de uma foto não impede excluir a conta.
