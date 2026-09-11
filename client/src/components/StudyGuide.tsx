import { useRef, useState } from 'react';
import { normalizeEnglishLevel } from '../data/levels';
import { levelGuideTip, studyGuides, type GuideTab, type StudyGuide as Guide } from '../data/study-guides';

export function StudyGuide({ tab, level, assessed }: { tab: GuideTab; level: string; assessed: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(0);
  const guide: Guide = studyGuides[tab];
  const englishLevel = normalizeEnglishLevel(level);
  const personalTip = levelGuideTip(tab, englishLevel, assessed);
  const slide = guide.pages[page];
  const label = guide.usage ? 'Como usar' : 'Como estudar aqui';
  function close() { dialog.current?.close(); }

  return <div className="study-guide-toolbar">
    <button ref={trigger} type="button" className="study-guide-trigger" aria-haspopup="dialog"
      onClick={() => { setPage(0); dialog.current?.showModal(); }}>
      <span aria-hidden="true">?</span> {label}
    </button>
    <dialog ref={dialog} className="study-guide-dialog" aria-labelledby="study-guide-title"
      onClose={() => trigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="study-guide-body">
        <header>
          <div><small>{guide.label}{personalTip ? assessed ? ` · Inglês ${englishLevel}` : ' · Primeiros passos' : ''}</small>
            <h2 id="study-guide-title">{label}</h2></div>
          <button type="button" className="study-guide-close" aria-label="Fechar manual" onClick={close} autoFocus>×</button>
        </header>
        <section className="study-guide-page" aria-live="polite" aria-atomic="true">
          <h3>{slide.title}</h3>
          <ol>{slide.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <p className="study-guide-tip"><strong>Dica: </strong>{page === 0 && personalTip ? personalTip : slide.tip}</p>
        </section>
        <nav className="study-guide-controls" aria-label="Páginas do manual">
          <button type="button" aria-label="Dicas anteriores" onClick={() => setPage(current => (current + guide.pages.length - 1) % guide.pages.length)}>←</button>
          <span>{page + 1} / {guide.pages.length}</span>
          <button type="button" aria-label="Próximas dicas" onClick={() => setPage(current => (current + 1) % guide.pages.length)}>→</button>
        </nav>
      </div>
    </dialog>
  </div>;
}
