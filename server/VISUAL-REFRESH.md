# Interface de estudo

Aplicados os itens 2, 3, 4, 5 e 6 da revisão visual. O fundo ilustrado, seus arquivos e sua configuração foram preservados por solicitação do usuário.

- Laranja sólido nas ações principais, seleção de navegação discreta, controles secundários neutros e amarelo nas recompensas. Sombras e gradientes de controles reduzidos.
- Títulos menores, leitura em peso regular e hierarquia de texto consistente nas áreas autenticadas. Login e apresentação mantêm seus estilos próprios.
- Métricas em faixa compacta, linhas e divisórias em listas de músicas, letras e missões. Progresso de jogo, missões e recompensas agrupados em um painel recolhido.
- Miniaturas dos vídeos nas músicas, com símbolo musical caso a imagem não carregue. Ilustrações SVG originais de cenários nas conversas e nos atalhos do Início, além de uma chama para recompensas.
- O Início prioriza continuar a última área de estudo visitada. `navigation.lastStudyTab` usa o armazenamento de atividades existente e preserva o rascunho daquela atividade. Sem histórico, sugere Lições; sem nivelamento concluído, prioriza o teste. Os atalhos abrem as áreas de lições, música e conversa, que mantêm suas recomendações existentes por nível.

Não exige migração SQL. O carrossel de abas no celular permanece.

Validação: build aprovado; testes de navegador `visual-study-home`, `lyrics-sync` e `ai-allowance` aprovados. A nova cobertura verifica retomada, persistência após recarregar, entrada de aluno sem nivelamento, manutenção do fundo ilustrado, carrossel e ausência de overflow em 320, 390 e 768 px. Capturas de desktop e celular revisadas. Imagens externas de músicas têm fallback; testes de interface usam dados sintéticos.
