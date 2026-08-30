import { FormEvent, useState } from 'react';
import {
  buildNativesFallbackUrl,
  buildRetryVariants,
  nativeLanguages,
  nativeSuggestions,
  searchNatives,
  type NativesLanguage,
  type NativesSearchResult
} from '../services/natives';

export function NativesTab() {
  const [query, setQuery] = useState('look forward to');
  const [lang, setLang] = useState<NativesLanguage>('english');
  const [result, setResult] = useState<NativesSearchResult | null>(null);
  const [activeVideo, setActiveVideo] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  async function performSearch(nextQuery = query) {
    const trimmed = nextQuery.trim();
    if (!trimmed || isSearching) return;

    setIsSearching(true);
    setError('');
    setResult(null);
    setActiveVideo('');
    setLastQuery(trimmed);
    setQuery(trimmed);

    try {
      const data = await searchNatives(trimmed, lang);
      setResult(data);
      setActiveVideo(data.videoIds?.[0] || '');
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Erro ao buscar vídeos.');
    } finally {
      setIsSearching(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    performSearch();
  }

  const fallbackUrl = result?.searchUrl || buildNativesFallbackUrl(lastQuery || query, lang);
  const retryVariants = buildRetryVariants(lastQuery || query);

  return (
    <section className="natives-layout" aria-label="Nativos">
      <header className="natives-hero">
        <p className="kicker">Nativos</p>
        <h1>Veja expressões em contexto real</h1>
        <p className="lead">
          A busca prioriza vídeos curtos com fala real, frase exata e contexto nativo.
        </p>
      </header>

      <form className="natives-search" onSubmit={handleSubmit}>
        <input
          className="field"
          placeholder="Ex: look forward to"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select value={lang} onChange={(event) => setLang(event.target.value as NativesLanguage)}>
          {nativeLanguages.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button className="primary-button" disabled={isSearching || !query.trim()} type="submit">
          {isSearching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      <div className="suggestion-tags">
        {nativeSuggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => performSearch(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      {activeVideo && (
        <section className="natives-result">
          <div className="panel-heading">
            <h2>{lastQuery}</h2>
            <span>{result?.curated ? 'curado' : result?.cached ? 'cache' : 'novo'}</span>
          </div>
          <div className="video-frame">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              src={`https://www.youtube-nocookie.com/embed/${activeVideo}?rel=0&modestbranding=1`}
              title={`Native result for ${lastQuery}`}
            />
          </div>
          {(result?.videoIds || []).length > 1 && (
            <div className="native-thumbs">
              {result?.videoIds.map((id) => (
                <button className={activeVideo === id ? 'active' : ''} key={id} type="button" onClick={() => setActiveVideo(id)}>
                  <img alt="" src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {result && !activeVideo && (
        <section className="natives-fallback">
          <span>Modo nativo</span>
          <h2>Refine a busca aqui dentro</h2>
          <p>{result.message || 'Nenhum vídeo confiável encontrado para essa expressão.'}</p>
          <strong>"{lastQuery}"</strong>
          <div className="suggestion-tags">
            {retryVariants.map((variant) => (
              <button key={variant} type="button" onClick={() => performSearch(variant)}>
                {variant}
              </button>
            ))}
          </div>
          <a className="secondary-link" href={fallbackUrl} rel="noopener noreferrer" target="_blank">
            Abrir busca exata no YouTube Shorts
          </a>
        </section>
      )}
    </section>
  );
}
