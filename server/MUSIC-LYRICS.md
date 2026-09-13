# Letras completas — 12/09/2026

Problema: músicas do catálogo trazem pequenos trechos de estudo. O cliente os considerava letras completas e não consultava o provedor. Além disso, a busca cortava a resposta em 80 linhas.

Correção: consultar o provedor para músicas do catálogo e rascunhos antigos; marcar a origem carregada com `lyricsVersion: 2`; remover o limite padrão de linhas; interpretar múltiplos timestamps LRC sem perder repetições. Tradução parcial continua permitindo ler o original. Em falha de busca, trechos de estudo são identificados como incompletos.

Consulta à API publicada em 12/09/2026: Shape of You retornou sucesso via LRCLIB com 93 linhas no campo sincronizado; Stay, 44. Essas contagens incluem as linhas do formato LRC e não representam revisão manual de cada verso ou validação dos tempos contra o vídeo.

Validação: build aprovado; 12 testes do cliente; teste móvel com 105 versos fictícios por faixa, incluindo restauração de rascunho antigo e troca de abas sem nova busca desnecessária. Nenhuma letra integral foi adicionada ao repositório.

Não requer migração SQL. Publicar o cliente atualizado; a versão antiga continua exibindo os trechos até o deploy e recarregamento.

## Vídeos com mais de uma música — 12/09/2026

A busca pública por `don toliver no pole` retornou um ID salvo com miniatura e duração herdadas de outro candidato. A seleção agora consulta os metadados reais de IDs salvos/verificados, exige relação entre consulta e título/artista e exclui compilações explícitas. Quando a duração da faixa é obtida de uma referência de letra com correspondência confiável, exclui vídeos com diferença superior a 30 segundos ou 15% (o maior dos dois). Se necessário, tenta uma busca adicional por áudio oficial.

Validação: 133 testes do servidor aprovados, 1 ignorado; 70 arquivos com sintaxe válida. Regressões cobrem cache com vídeo longo, títulos de compilação e fallback para áudio oficial. A regra usa metadados, não análise do áudio; sem duração de referência, só os filtros de metadados se aplicam. A reprodução integral de No Pole após o deploy ainda precisa ser conferida.

Não requer SQL nem apagar caches: vídeos anteriormente salvos são revalidados quando encontrados pela busca atualizada.

## No Pole: título e artista invertidos (13/09/2026)

A busca também retorna `No Pole - Don Toliver | Clean Version`. Esse formato era interpretado como artista `No Pole` e faixa `Don Toliver | Clean Version`. A consulta agora testa a identidade direta e invertida, removendo apenas o sufixo de apresentação `| Clean Version`, e exige correspondência exata de faixa e artista no provedor para essa recuperação. Funciona também com os campos invertidos de rascunhos salvos. Remix/live continuam sujeitos às verificações existentes.

Validação: 19 testes de letras aprovados, incluindo a rota com metadados invertidos, rascunho sem título de vídeo e rejeição de outro artista. Consulta real ao LRCLIB confirmou `No Pole` / `Don Toliver`, com sincronismo e 57 linhas LRC. Nenhuma letra foi incorporada ao repositório. Não exige migração SQL; publicar o servidor atualizado.

## Ajuste de legenda por vídeo

“Ajustar legenda” fica recolhido junto ao player. “A primeira frase começa agora” calcula a diferença entre o tempo do vídeo e o primeiro timestamp da letra. “Adiantar 0,5 s”, “Atrasar 0,5 s” e “Restaurar” permitem refinar ou remover o ajuste. Antes do primeiro verso ajustado, a tela mostra “Aguardando início do canto”, sem destacar a primeira frase antecipadamente.

O mapa `music.lyricOffsets`, indexado pelo ID do vídeo realmente em reprodução, usa a sincronização autenticada de atividades existente. Ajustes são pessoais, retomam em outro dispositivo e não alteram a letra compartilhada nem outras versões do vídeo. Não exige SQL novo.

“Pausar legenda” fica visível junto à legenda e congela tanto a frase do karaokê quanto o destaque na lista, mantendo o vídeo independente. “Retomar legenda” continua do instante pausado e incorpora o tempo decorrido do vídeo ao ajuste salvo. Trocar de música/vídeo ou usar os controles de ajuste encerra a pausa. A pausa em andamento é temporária nesta tela; apenas o ajuste final é salvo na conta. O destaque também funciona para versos no instante zero.

Isso permite compensar manualmente cenas sem canto durante a reprodução. Como ainda existe um único deslocamento por vídeo, voltar para um trecho anterior à pausa pode exigir novo ajuste; sincronismo automático diferente em cada trecho exige uma futura linha do tempo de marcações.

Validação: build aprovado e teste `server/test/e2e/lyrics-sync.test.js` aprovado com player simulado, cobrindo início, ajuste fino, restauração, persistência entre dispositivos, isolamento por vídeo e larguras de 320, 390 e 768 px. Captura móvel revisada. A publicação permanece pendente do envio ao Git.

O teste também cobre congelar a frase enquanto o relógio do vídeo avança, retomar da mesma frase, avançar ao próximo verso depois da retomada e limpar a pausa ao restaurar ou trocar de música. Build e teste de navegador aprovados após adicionar a pausa.

## Recuperação do player — 13/09/2026

O iframe agora é criado em um contêiner controlado pelo ciclo de vida do player. A API do YouTube remove seu iframe em `destroy()`; o React não deve tentar reutilizar esse mesmo nó ao recarregar ou trocar de aba. Cada tentativa recebe um iframe novo. O carregador da API é compartilhado, limpa callbacks e tem prazo de 12 segundos. Se a API de sincronismo for bloqueada, o iframe comum continua disponível para toque e reprodução; a tela avisa que o destaque automático está indisponível.

Erros de incorporação e identificação da página têm mensagens diferentes; somente erros que indicam vídeo indisponível/bloqueado são enviados como falha do conteúdo. O botão de recarregar mantém a alternativa de host já existente.

Fonte técnica: https://developers.google.com/youtube/iframe_api_reference (ciclo de vida e códigos de erro). Isso não remove restrições de reprodução impostas pelo YouTube ou pelo dono do vídeo.

Validação: build aprovado; testes de navegador `lyrics-sync`, `full-music-lyrics` e `video-recovery` aprovados. O último simula a remoção real do iframe por `destroy()`, uma falha 153, recarga e toque no iframe quando a API está bloqueada. A simulação usa navegador com viewport móvel; não equivale a reprodução de vídeos reais no Safari de um iPhone.

Consulta ao site publicado em 13/09/2026: Stay retornou 44 linhas LRC, Shape of You 93 e No Pole 57, todas com sucesso. Nenhuma letra foi copiada para o repositório. A nova correção do ciclo de vida ainda aguarda publicação.
