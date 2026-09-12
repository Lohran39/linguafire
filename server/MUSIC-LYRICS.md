# Letras completas — 12/09/2026

Problema: músicas do catálogo trazem pequenos trechos de estudo. O cliente os considerava letras completas e não consultava o provedor. Além disso, a busca cortava a resposta em 80 linhas.

Correção: consultar o provedor para músicas do catálogo e rascunhos antigos; marcar a origem carregada com `lyricsVersion: 2`; remover o limite padrão de linhas; interpretar múltiplos timestamps LRC sem perder repetições. Tradução parcial continua permitindo ler o original. Em falha de busca, trechos de estudo são identificados como incompletos.

Consulta à API publicada em 12/09/2026: Shape of You retornou sucesso via LRCLIB com 93 linhas no campo sincronizado; Stay, 44. Essas contagens incluem as linhas do formato LRC e não representam revisão manual de cada verso ou validação dos tempos contra o vídeo.

Validação: build aprovado; 12 testes do cliente; teste móvel com 105 versos fictícios por faixa, incluindo restauração de rascunho antigo e troca de abas sem nova busca desnecessária. Nenhuma letra integral foi adicionada ao repositório.

Não requer migração SQL. Publicar o cliente atualizado; a versão antiga continua exibindo os trechos até o deploy e recarregamento.
