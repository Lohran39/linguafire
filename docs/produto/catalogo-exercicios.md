# Catálogo de exercícios

## Ampliação de setembro de 2026

- Lições: 10 novos conjuntos com 5 questões cada, dois conjuntos por nível de A1 a C1. Temas: casa, rotina, passado, transporte, vida digital, planos, feedback, mídia, evidências e diplomacia.
- Nativos: 25 novas práticas contextualizadas, cinco por nível, distribuídas pelas situações existentes. Cada prática inclui significado, exemplo, contexto de uso e observação.
- Revisão: 50 novos cartões, dez por nível, com tradução e frase de exemplo. As sessões permanecem com 10 ou 20 cartões.

O catálogo complementa os conteúdos anteriores e preserva seus identificadores e progresso. Os níveis são classificações editoriais para organizar a prática, não certificação de proficiência.

## Arquivos

- `client/src/data/additional-lessons.ts`
- `client/src/data/additional-native-practice.ts`
- `server/data/additional-flashcards.json`

As recomendações de Nativos usam uma ordem determinística por dia e priorizam o nível próximo ao aluno. A fila de prática prioriza conteúdos ainda não concluídos.

Na Revisão, o parâmetro opcional `category` em `/api/flashcards/available` filtra o catálogo antes do limite de 20 cartões. Cartões vencidos da categoria vêm antes dos novos; cartões com revisão futura continuam fora da sessão. As falhas de conexão continuam sendo apresentadas ao usuário.

Não há mudança de limite diário, preço, consumo de IA ou esquema do banco. Não precisa de migração SQL.

## Validação

Os testes de expansão verificam identificadores, alternativas distintas, explicações, distribuição por nível e rotação diária. Os testes de revisão verificam categoria, prioridade e exclusão de cartões agendados para o futuro. Essas verificações estruturais não substituem a revisão pedagógica com alunos e professores.

Totais após a ampliação: 28 lições, 72 práticas em Nativos e 237 cartões no catálogo de revisão.

Validação em 15/09/2026: build aprovado, 22 testes de cliente e 169 de servidor. Os 20 cenários de navegador passaram; o cenário de benefícios da loja foi reexecutado após ajustar a resolução da importação TypeScript usada pelo teste. Os serviços externos são simulados nesses cenários.
