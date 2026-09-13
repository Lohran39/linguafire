import { useActivityState } from '../hooks/activity-progress';
import { StudyArtwork } from './StudyArtwork';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeGrammar,
  formulateConversationResponse,
  getConversationTopics,
  sendConversationMessage,
  type ConversationMessage,
  type ConversationTopic,
  type GrammarError
} from '../services/conversation';
import { getProfile, type UserProfile } from '../services/auth';
import { englishLevelIndex, normalizeEnglishLevel } from '../data/levels';

type ConversationTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

const hints: Record<string, string[]> = {
  restaurant: ['Peça uma mesa', 'Pergunte sobre o cardápio', 'Peça a conta'],
  airport: ['Faça check-in', 'Pergunte sobre o portão', 'Peça ajuda com a bagagem'],
  job_interview: ['Fale sobre experiência', 'Pergunte sobre a empresa', 'Mostre suas habilidades'],
  small_talk: ['Fale sobre seu dia', 'Comente sobre o clima', 'Pergunte sobre hobbies'],
  shopping: ['Pergunte preços', 'Busque outro tamanho', 'Peça troco']
};

const topicLevels: Record<string, string> = {
  small_talk: 'A1',
  shopping: 'A2',
  restaurant: 'A2',
  airport: 'B1',
  job_interview: 'B2'
};

const contextLockMessage = 'This practice is locked because you kept leaving the scenario. Start a new situation to continue.';
const PLAN_AI_LIMITS: Record<string, number> = { free: 10, pro: 50, max: 150 };

function sortTopicsForLevel(topics: ConversationTopic[], userLevel: string) {
  return [...topics].sort((a, b) => {
    const aDistance = Math.abs(englishLevelIndex(topicLevels[a.id] || 'A1') - englishLevelIndex(userLevel));
    const bDistance = Math.abs(englishLevelIndex(topicLevels[b.id] || 'A1') - englishLevelIndex(userLevel));
    return aDistance - bDistance;
  });
}

function topicLabel(topic: ConversationTopic) {
  return topic.name.replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

export function ConversationTab({ user, onProfileRefresh }: ConversationTabProps) {
  const [topics, setTopics] = useState<ConversationTopic[]>([]);
  const [activeTopic, setActiveTopic] = useActivityState<ConversationTopic | null>('conversation', 'activeTopic', null);
  const [messages, setMessages] = useActivityState<ConversationMessage[]>('conversation', 'messages', []);
  const [input, setInput] = useActivityState('conversation', 'input', '');
  const [isSending, setIsSending] = useState(false);
  const [isFormulating, setIsFormulating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const operationBusy = useRef(false);
  const [notice, setNotice] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useActivityState('conversation', 'lastFailedMessage', '');
  const [isContextLocked, setIsContextLocked] = useActivityState('conversation', 'isContextLocked', false);
  const [grammarErrors, setGrammarErrors] = useActivityState<GrammarError[]>('conversation', 'grammarErrors', []);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const recommendedTopics = useMemo(() => sortTopicsForLevel(topics, englishLevel), [topics, englishLevel]);

  const userPlan = String(user.plan || (user.subscription_active ? 'pro' : 'free')).toLowerCase();
  const aiLimit = Number(user.ai_daily_limit ?? PLAN_AI_LIMITS[userPlan] ?? PLAN_AI_LIMITS.free);
  const aiRemaining = useMemo(() => {
    return Math.max(0, aiLimit - Number(user.ai_uses_today || 0));
  }, [aiLimit, user.ai_uses_today]);

  useEffect(() => {
    let isMounted = true;

    async function loadTopics() {
      try {
        const result = await getConversationTopics();
        if (isMounted) setTopics(result);
      } catch {
        if (isMounted) setNotice('Não foi possível carregar tópicos.');
      }
    }

    loadTopics();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages, isSending]);

  function startTopic(topic: ConversationTopic) {
    setActiveTopic(topic);
    setGrammarErrors([]);
    setNotice('');
    setLastFailedMessage('');
    setIsContextLocked(false);
    setMessages([
      {
        role: 'assistant',
        content: `Hi! Welcome to ${topicLabel(topic)}. Let's practice in English.`
      }
    ]);
  }

  async function refreshUsage() {
    try { onProfileRefresh(await getProfile()); } catch { /* the next profile refresh reconciles usage */ }
  }
  const quotaText = `${userPlan.toUpperCase()} · ${aiRemaining}/${aiLimit} usos hoje${user.ai_monthly_limit != null ? ` · ${Math.max(0,user.ai_monthly_limit-Number(user.ai_uses_month || 0))}/${user.ai_monthly_limit} neste mês` : ''}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !activeTopic || operationBusy.current || isContextLocked) return;
    operationBusy.current = true;

    const nextMessages: ConversationMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setNotice('');
    setLastFailedMessage(trimmed);
    setIsSending(true);

    try {
      const reply = await sendConversationMessage(activeTopic.id, trimmed, messages, englishLevel);
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
      setLastFailedMessage('');
      if (reply.includes(contextLockMessage)) {
        setIsContextLocked(true);
        setNotice('Essa prática foi bloqueada por sair do contexto. Escolha outro cenário para continuar.');
      }

    } catch (error) {
      setLastFailedMessage(trimmed);
      setNotice(error instanceof Error ? error.message : 'Erro na conversa.');
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: 'Não consegui responder agora. Você pode tentar novamente sem perder a conversa.' }
      ]);
    } finally {
      await refreshUsage();
      operationBusy.current = false;
      setIsSending(false);
    }
  }

  function retryLastMessage() {
    if (!lastFailedMessage || isSending) return;
    setInput(lastFailedMessage);
    setNotice('');
  }

  async function formulateResponse() {
    if (!activeTopic || operationBusy.current || isContextLocked) return;
    operationBusy.current = true;

    try {
      setIsFormulating(true);
      setNotice('');
      const suggestion = await formulateConversationResponse(activeTopic.id, messages, englishLevel);
      setInput(suggestion);

    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível formular a resposta.');
    } finally {
      await refreshUsage();
      operationBusy.current = false;
      setIsFormulating(false);
    }
  }

  async function closeConversation() {
    if (operationBusy.current) return;
    operationBusy.current = true; setIsAnalyzing(true);
    try {
      if (activeTopic && messages.some(message => message.role === 'user')) {
        setGrammarErrors(await analyzeGrammar(activeTopic.id, messages));
      }
      setActiveTopic(null); setMessages([]); setInput('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível analisar os erros. Tente novamente.');
    } finally {
      await refreshUsage(); operationBusy.current = false; setIsAnalyzing(false);
    }
  }

  if (!activeTopic) {
    return (
      <section className="conversation-layout" aria-label="Conversar">
        <header className="conversation-hero">
          <p className="kicker">Conversar</p>
          <h1>Pratique inglês em cenários reais</h1>
          <p className="lead">
            Contextos e respostas ajustados para {englishLevel}. A IA conduz a conversa e pode analisar erros gramaticais ao final.
          </p>
          <div className={aiRemaining <= 3 ? 'ai-counter warning' : 'ai-counter'}>
            {quotaText}
          </div>
        </header>

        {notice && <div className="form-success">{notice}</div>}

        {grammarErrors.length > 0 && (
          <section className="grammar-panel">
            <h2>Última análise</h2>
            <p>Seus erros estão nos flashcards e na lição “Erros da conversa”.</p>
            {grammarErrors.map((error, index) => (
              <article key={`${error.incorrect}-${index}`}>
                <strong>{error.type || 'grammar'}</strong>
                <span>{error.incorrect}</span>
                <small>{error.correct}</small>
              </article>
            ))}
          </section>
        )}

        <div className="topic-grid">
          {recommendedTopics.map((topic) => (
            <button className="topic-card" key={topic.id} type="button" onClick={() => startTopic(topic)}>
              <StudyArtwork scene={topic.id} />
              <strong>{topicLabel(topic)}</strong>
              <small>{topicLevels[topic.id]} · {hints[topic.id]?.[0] || 'Pratique inglês com IA'}</small>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="conversation-room" aria-label={`Conversa ${activeTopic.name}`}>
      <header className="room-header">
        <div>
          <p className="kicker">{activeTopic.name}</p>
          <h1>{topicLabel(activeTopic)}</h1>
        </div>
        <button className="secondary-button" type="button" disabled={isSending || isFormulating || isAnalyzing} onClick={closeConversation}>
          Fechar e analisar
        </button>
      </header>

      <details><summary>Opções da conversa</summary><button type="button" className="secondary-button" disabled={isSending || isFormulating || isAnalyzing} onClick={() => { setActiveTopic(null); setMessages([]); setInput(''); setNotice('Conversa encerrada sem análise e sem gastar outro uso de IA.'); }}>Sair sem analisar</button></details>
      <div className="hint-strip">{hints[activeTopic.id]?.[messages.length % hints[activeTopic.id].length]}</div>

      {(notice || (lastFailedMessage && !isSending)) && (
        <div className="conversation-notice" role="status">
          <span>{notice || 'Sua última mensagem ficou sem resposta. Recarregue o texto para tentar novamente.'}</span>
          {lastFailedMessage && (
            <button type="button" onClick={retryLastMessage}>
              Recarregar texto
            </button>
          )}
        </div>
      )}

      <div className="message-list" role="log" aria-label="Mensagens da conversa" aria-live="polite" ref={messagesRef}>
        {messages.map((message, index) => (
          <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </article>
        ))}
        {isSending && <article className="message assistant">Digitando...</article>}
      </div>

      <p className="admin-note">{quotaText}. Cada envio, sugestão e análise consome 1 uso de IA. A análise considera suas últimas 10 mensagens.</p>
      <form className="conversation-form" onSubmit={handleSubmit}>
        <input
          className="field"
          disabled={isContextLocked}
          aria-label="Sua resposta em inglês"
          maxLength={2000}
          placeholder={isContextLocked ? 'Escolha outro cenário para continuar.' : 'Type your answer in English...'}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button className="primary-button" disabled={isSending || isFormulating || isAnalyzing || isContextLocked || !input.trim()} type="submit">
          Enviar
        </button>
        <button className="secondary-button" disabled={isSending || isFormulating || isAnalyzing || isContextLocked} type="button" onClick={formulateResponse}>
          {isFormulating ? 'Formulando...' : 'Formular resposta'}
        </button>
      </form>
    </section>
  );
}
