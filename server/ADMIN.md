# Organização do Admin

O Admin abre em **Visão geral**, com contas cadastradas, alunos ativos hoje e em 28 dias, retorno no dia 7, até três denúncias e três cadastros recentes.

- **Alunos:** até oito cadastros recentes. Clique no nome para expandir os dados; os emails ficam mascarados. O ranking de até dez contas e os detalhes de cadastro ficam recolhidos. Não é uma lista completa ou uma busca global.
- **Conteúdos:** filtre músicas ou Nativos, escolha uma denúncia para abrir a ficha, confira vídeo/texto/tradução e aprove ou reprove. Conteúdos revisados têm filtro de estado. A associação manual de vídeos a expressões de Nativos fica recolhida e não equivale à verificação.
- **Uso e retorno:** retorno D1/D7 e abas acessadas. A explicação do cálculo fica em um bloco expansível. Acesso não significa conclusão de exercício nem satisfação.

No computador, a navegação fica à esquerda; até 900 px, vira uma faixa horizontal deslizante. Os indicadores ficam em duas colunas no celular. Os rascunhos são preservados entre seções internas do Admin; não são persistidos ao sair do Admin ou recarregar a página.

Os dados usam as APIs existentes. A reorganização visual não exige SQL; a nova área de IA depende de `migrations/20260912-ai-plan-quotas.sql`. Falhas de cada fonte são sinalizadas separadamente. Se uma atualização falhar, os dados anteriores ficam visíveis com o aviso de falha. A fila carrega até 100 denúncias antigas; ao atingir o limite, a visão geral mostra “100 ou mais”. A lista de revisados depende do limite existente de até 1.000 itens por tipo.

A área **IA e operação** agora mostra tentativas, falhas, tokens e custo estimado por plano/modelo (30 dias), após a migração de franquias. Consulte `AI-PLAN-ROLLOUT.md`. Resultados da avaliação pedagógica, plano por aluno e métricas financeiras da Stripe ainda precisam de integração. Não são exibidos números demonstrativos nem estados de saúde presumidos.

## Verificação

```sh
npm run build
RUN_PLAYWRIGHT_E2E=1 node --test server/test/e2e/admin-workspace.test.js
```

O teste usa APIs simuladas, verifica revisão e atualização da fila, preservação do rascunho, teclado, falha isolada de métricas e ausência de transbordamento horizontal em 320 e 390 px. Não valida os dados reais de produção nem a correção pedagógica de conteúdos.
