import { ContentReview } from './ContentReview';
import { isVerified, type ContentIdentity, type CurationItem } from '../services/curation';
import { buildNativeEmbedUrl } from '../services/native-practice';

type Props = {
  activeVideo: string; lastQuery: string; activeCuration?: CurationItem;
  contentIdentity: ContentIdentity; curationUnavailable: boolean;
  activeVideoSaved: boolean; savedVideoMessage: string; visibleVideoIds: string[];
  toggleSavedVideo: () => void; markActiveVideoAsBad: () => void; setActiveVideo: (id: string) => void;
};
const translationLabels = { available: 'Tradução conferida na revisão', partial: 'Tradução parcial', missing: 'Tradução ausente' };
export function NativeVideoResult({ activeVideo, lastQuery, activeCuration, contentIdentity, curationUnavailable,
  activeVideoSaved, savedVideoMessage, visibleVideoIds, toggleSavedVideo, markActiveVideoAsBad, setActiveVideo }: Props) {
  return (
        <section className="natives-result">
          <div className="panel-heading">
            <h2>{lastQuery}</h2>
            <span>{isVerified(activeCuration) ? 'Verificado' : 'Exemplo em vídeo'}</span>
          </div>
          <div className="video-frame native-video-frame">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="native-video-iframe"
              height="100%"
              id="nativesIframe"
              key={activeVideo}
              referrerPolicy="strict-origin-when-cross-origin"
              src={buildNativeEmbedUrl(activeVideo)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              title={`Native result for ${lastQuery}`}
              width="100%"
            />
          </div>
          <details className="native-disclosure"><summary>Detalhes e opções do vídeo</summary>
          <ContentReview key={`${contentIdentity.title}:${contentIdentity.lang}:${activeVideo}`} content={contentIdentity} item={activeCuration} translation={activeCuration ? translationLabels[activeCuration.translation] : 'Tradução ainda não verificada'} unavailable={curationUnavailable} />
          <div className="native-video-actions">
            <button type="button" onClick={toggleSavedVideo}>
              {activeVideoSaved ? 'Remover salvo' : 'Salvar vídeo'}
            </button>
            <button type="button" onClick={markActiveVideoAsBad}>
              Vídeo ruim
            </button>
            <a href={`https://www.youtube.com/watch?v=${activeVideo}`} rel="noopener noreferrer" target="_blank">
              Abrir no YouTube
            </a>
            <small>Não mostrar de novo para esta busca.</small>
          </div>
          </details>
          {savedVideoMessage && <div className="form-success">{savedVideoMessage}</div>}
          {visibleVideoIds.length > 1 && (
            <div className="native-thumbs">
              {visibleVideoIds.map((id, index) => (
                <button aria-label={`Assistir vídeo ${index + 1}`} aria-pressed={activeVideo === id} className={activeVideo === id ? 'active' : ''} key={id} type="button" onClick={() => setActiveVideo(id)}>
                  <img alt="" src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} />
                </button>
              ))}
            </div>
          )}
        </section>
  );
}
