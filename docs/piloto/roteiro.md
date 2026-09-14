# Piloto com alunos reais

[Índice da documentação](../README.md)

Objetivo: descobrir se os alunos voltam e quais atividades ajudam no estudo. Métricas instrumentadas não equivalem a um piloto já realizado.

## Situação atual

Piloto preparado, ainda sem sessões realizadas ou resultados de alunos. O responsável pelo projeto convidará os participantes e trará as respostas. Não houve envio de convites pelo assistente.

## Participantes e duração

Comece com 5–10 alunos, preferencialmente adultos, com diferentes níveis de inglês. Inclua pessoas que usam iPhone/Safari e Android/Chrome. Use códigos P01, P02 etc. no registro, sem nomes, senhas ou conversas completas.

D0 é a primeira sessão (15–20 minutos). Acompanhe D1, D3 e D7; D7 significa sete dias depois da primeira sessão, não o sétimo dia do calendário. O retorno em D7 precisa ser observado nesse dia se for comparado ao indicador D7 do Admin.

## Antes de convidar

1. Confirmar as migrações e o deploy, inclusive vidas e métricas de uso (`server/migrations/20260910-product-usage.sql`).
2. Abrir o site em uma conta de aluno comum e concluir uma lição; contas Admin não entram nas métricas de uso.
3. Conferir o painel Admin → Retorno dos alunos e uso. Anotar a versão testada e as datas de início e fim.
4. Fazer uma sessão interna para verificar login, Lições, Revisão e reprodução de um vídeo. Se o vídeo falhar, registrar como problema conhecido.
5. Publicar a migração de confirmação de e-mail e testar o recebimento com o responsável. Não começar convites enquanto o cadastro estiver bloqueado ou o envio não tiver sido validado.

## Convite pronto para copiar

> Estou testando o LinguaFire, meu projeto para estudar inglês. Você toparia usar por alguns minutos e me contar o que funcionou e o que ficou confuso? A primeira sessão leva cerca de 15 minutos, e volto a perguntar depois de sete dias. Não precisa comprar nada nem ser bom em inglês: estamos testando o site. A plataforma registra uso das abas e resultados dos exercícios. Você pode parar quando quiser. Podemos combinar um horário?

Envie manualmente apenas para pessoas que você deseja convidar. Combine qualquer observação de tela; não grave a sessão por padrão.

## Sessão inicial — D0

Diga: “Vou observar como você usa o site. Pense em voz alta. Se algo ficar confuso, isso ajuda a melhorar o produto.” Não ensine o caminho antes de a pessoa tentar. Se precisar ajudar, anote a ajuda; não registre como conclusão independente.

| Tarefa para ler ao aluno | O que observar |
| --- | --- |
| Entre na conta e encontre um conteúdo adequado para começar. | Encontra nivelamento ou sugestão? Entende o nível? |
| Crie sua conta e confirme pelo e-mail recebido. | Encontra o e-mail, entende a definição da senha e consegue entrar? Testar em uma conta nova de cada participante. |
| Faça uma lição curta e salve o resultado. | Encontra o exercício sem abrir todo o catálogo? Entende a correção e o salvamento? |
| Saia de Lições durante outro exercício e volte para continuar. | Retoma sem reiniciar? “Continuar exercício” faz sentido? |
| Encontre uma lição diferente e volte para estudar. | Descobre “Explorar outras lições”? O catálogo fecha ao escolher? |
| Revise algumas palavras. | Tenta lembrar antes de revelar e entende a autoavaliação? |
| Converse por três mensagens sobre uma situação familiar. | Sabe como começar e entende o retorno da IA? |
| Escolha um vídeo em Nativos e tente estudar uma expressão. | O vídeo roda? Consegue localizar a prática e relacioná-la à frase indicada? |
| Abra uma música, acompanhe a letra e pause apenas a legenda. | Vídeo toca no celular? A letra continua da frase pausada? Introdução precisa de ajuste? |

Se houver tempo, peça que encontre “Como estudar aqui” e explique a diferença entre Prática livre e Desafio. Não exija compra de vidas; as tarefas principais usam prática livre. Se não houver cartões, não conte isso como falha do aluno: registre a condição encontrada.

Para cada tarefa, anote: concluída sem ajuda / com ajuda / não concluída / não tentou; tempo aproximado; ponto de bloqueio; uma frase curta do relato, com autorização. Registre separadamente falhas de rede ou provedores.

## Perguntas após a sessão

1. O que você acha que aprendeu ou praticou? Dê um exemplo.
2. O que foi mais difícil de encontrar ou entender?
3. Alguma correção pareceu errada ou confusa? Qual era a dúvida, sem copiar a conversa inteira?
4. Que atividade você usaria novamente? Por quê?
5. De 1 (muito difícil) a 5 (muito fácil), como foi usar o site?

## Acompanhamento

- **D1:** observe o retorno no Admin antes de enviar lembretes. Pergunte se voltou e o que motivou ou impediu a volta.
- **D3:** pergunte qual atividade foi útil e qual dificuldade ainda acontece.
- **D7:** confira o retorno do dia e pergunte: “O que faria você continuar usando? O que faria você parar? Qual atividade faria falta?”

Registre se cada contato ocorreu antes ou depois do uso. Um retorno provocado por lembrete não deve ser apresentado como retorno espontâneo. Não substitua ausência de resposta por nota zero.

## Registro e decisão

Copie uma ficha de [respostas](respostas.md) por participante. Traga as fichas preenchidas para a análise; por enquanto, todos os resultados estão pendentes.

Priorize primeiro bloqueios (não conseguir entrar, concluir ou salvar, vídeo indisponível, cobrança de XP sem benefício); depois problemas observados em duas ou mais pessoas. Uma correção pedagógica incorreta pode exigir ação mesmo aparecendo uma vez. Cada problema deve ter tela, passos para reproduzir, dispositivo e resultado esperado. Após corrigir, peça ao participante afetado para repetir a tarefa.

## Medição

O Admin mostra ativos hoje, ativos nos últimos 28 dias, uso por aba e retorno no dia exato D1/D7 desde o primeiro acesso observado. Datas usam UTC. A primeira coorte só começa quando a instrumentação entra no ar; usuários antigos também contam a partir do primeiro evento observado. Administradores não entram. Cada aluno gera no máximo um registro por aba por dia.

Os denominadores de retenção incluem somente pessoas que já tiveram tempo de chegar ao dia medido, em coortes de até 90 dias. Com zero elegíveis, mostre “aguardando”, nunca 0% como resultado. Uma aba aberta não prova conclusão ou utilidade. Use os resultados de aprendizado já existentes e as entrevistas para interpretar os números.

Compare contagens absolutas junto das taxas. Uma amostra de 5–10 pessoas serve para identificar problemas e hipóteses, não para provar causalidade ou significância estatística. Priorize problemas recorrentes observados, acompanhados de relatos, e repita o piloto após corrigir.

## Revisão pedagógica

A suíte contém 36 casos sintéticos: 20 nos cinco cenários, 10 para dialeto, ambiguidade, elipses, gírias e preservação de sentido e 6 adicionais com B2/C2 e histórico de conversa. Rode a partir de `server`: `AI_EVAL_LIVE=1 npm run eval:ai`. A chave fica no ambiente ou no `.env`; nunca inclua credenciais no relatório. São até 36 casos, com possíveis requisições adicionais pelas tentativas do provedor.

O resultado padrão fica em `/tmp/linguafire-ai-eval.json` (configure `AI_EVAL_REPORT` para outro caminho). `automaticPassed` representa apenas checagens heurísticas; `pedagogicalStatus: pending_review` exige leitura das respostas. `completed` conta respostas recebidas, `attempted` inclui erros do provedor e `notRun` conta os casos restantes. A primeira falha do provedor interrompe a rodada para evitar consumo inútil.

As checagens podem rejeitar paráfrases corretas ou deixar passar erros sutis. Revise cada resposta comparando com a entrada, a correção esperada e `reviewGuidance`. Preencha os cinco critérios de `pedagogicalReview`, adicione justificativa e só então altere o status. Não interprete os testes unitários da suíte como avaliação do modelo real.

Execute `AI_EVAL_LIVE=1 npm run eval:ai` no servidor antes de mudanças de modelo/prompt. No relatório de exemplos sintéticos, um revisor deve avaliar: correção necessária, significado preservado, explicação correta, adequação ao nível e resposta natural. Marque cada critério como aprovado/reprovado e anote justificativa. Transforme cada falha confirmada em novo caso de regressão; não guarde conversas completas de alunos para montar o conjunto.
