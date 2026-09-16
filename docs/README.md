# Documentação do LinguaFire

[Voltar ao README do projeto](../README.md)

Para instalar, desenvolver e executar os testes, comece pelo README principal. Aqui ficam os guias por assunto e os registros históricos.

## Produto

| Documento | Conteúdo |
| --- | --- |
| [Músicas e legendas](produto/musicas-e-legendas.md) | Busca, letras completas, player, sincronização e pausa. |
| [Interface](produto/interface.md) | Organização visual e experiência de estudo. |
| [Perfil](produto/perfil.md) | Resumo do aluno, configurações, assinatura e segurança dos dados. |
| [Loja e XP](produto/loja-e-xp.md) | Benefícios, vidas, desafios e regras de compra. |
| [Admin](produto/admin.md) | Áreas do painel e indicadores de operação. |

<a id="operacao"></a>

## Operação

| Documento | Conteúdo |
| --- | --- |
| [Produção](operacao/producao.md) | Redis, logs, métricas e avaliação da IA. |
| [Segurança de autenticação](operacao/seguranca-autenticacao.md) | Confirmação de e-mail, recuperação, limites e publicação. |
| [Planos e consumo de IA](operacao/planos-ia.md) | Franquias, custos, migrações e validação. |
| [Manutenção e módulos](operacao/refatoracao.md) | Sincronização, serviços de Música e Nativos, validação e testes. |

## Piloto

1. [Comece aqui](piloto/comece-aqui.md): convite e primeira sessão com cinco alunos.
2. [Roteiro completo](piloto/roteiro.md): tarefas, acompanhamento e critérios pedagógicos.
3. [Ficha de respostas](piloto/respostas.md): modelo para preencher por participante.

<a id="historico"></a>

## Histórico

Estes arquivos preservam o que foi observado em cada ocasião; não comprovam o estado atual do site.

- [Avaliação de IA — 11/09/2026](historico/avaliacao-ia-2026-09-11.md)
- [Entrega de segurança, músicas, IA e piloto — 13/09/2026](historico/entrega-2026-09-13.md)
- [Anotações iniciais](historico/anotacoes-iniciais.md), antes em `detalhes.md`.

## Convenções

- Novos guias ficam na pasta do assunto correspondente, com nomes descritivos em minúsculas, sem espaços ou acentos.
- Registros de uma entrega ou avaliação ficam em `historico/`, com a data no nome.
- Links entre documentos são relativos ao arquivo. Caminhos de código e comandos são relativos à raiz do repositório, salvo quando houver um `cd` explícito ou outra indicação.
- Scripts, casos executáveis e migrações SQL permanecem em `server/`; documentação não altera o lugar desses arquivos.
- Ao adicionar ou mover um guia, atualize este índice e suas referências.

- [Catálogo de exercícios](produto/catalogo-exercicios.md): novos conteúdos de Lições, Nativos e Revisão.
