# Piloto com alunos reais

Objetivo: descobrir se os alunos voltam e quais atividades ajudam no estudo. Métricas instrumentadas não equivalem a um piloto já realizado.

## Condução

Convide 5–10 pessoas do público pretendido para 14 dias de uso. Combine expectativas e explique que a plataforma registra acesso diário às funcionalidades e resultados de atividades; não peça dados sensíveis. Convites não são enviados automaticamente.

Na primeira sessão, observe sem guiar: criar conta, escolher uma atividade, completar uma lição, conversar e revisar. Registre dificuldades, tempo até a primeira atividade concluída e se a pessoa entendeu a correção. Peça que descreva em suas palavras o que aprendeu.

No dia 7 e no dia 14, pergunte: quando o app foi útil, por que voltou ou parou, qual atividade ajudou mais, qual correção pareceu errada e qual funcionalidade faria falta. Não transforme satisfação declarada em retenção medida.

## Medição

O Admin mostra ativos hoje, ativos nos últimos 28 dias, uso por aba e retorno no dia exato D1/D7 desde o primeiro acesso observado. Datas usam UTC. A primeira coorte só começa quando a instrumentação entra no ar; usuários antigos também contam a partir do primeiro evento observado. Administradores não entram. Cada aluno gera no máximo um registro por aba por dia.

Os denominadores de retenção incluem somente pessoas que já tiveram tempo de chegar ao dia medido, em coortes de até 90 dias. Com zero elegíveis, mostre “aguardando”, nunca 0% como resultado. Uma aba aberta não prova conclusão ou utilidade. Use os resultados de aprendizado já existentes e as entrevistas para interpretar os números.

Compare contagens absolutas junto das taxas. Uma amostra de 5–10 pessoas serve para identificar problemas e hipóteses, não para provar causalidade ou significância estatística. Priorize problemas recorrentes observados, acompanhados de relatos, e repita o piloto após corrigir.

## Revisão pedagógica

Execute `AI_EVAL_LIVE=1 npm run eval:ai` no servidor antes de mudanças de modelo/prompt. No relatório de exemplos sintéticos, um revisor deve avaliar: correção necessária, significado preservado, explicação correta, adequação ao nível e resposta natural. Marque cada critério como aprovado/reprovado e anote justificativa. Transforme cada falha confirmada em novo caso de regressão; não guarde conversas completas de alunos para montar o conjunto.
