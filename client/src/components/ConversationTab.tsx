import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeGrammar,
  getConversationTopics,
  sendConversationMessage,
  type ConversationMessage,
  type ConversationTopic,
  type GrammarError
} from '../services/conversation';
import type { UserProfile } from '../services/auth';
import { englishLevelIndex, normalizeEnglishLevel } from '../data/levels';

type ConversationTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

const hints: Record<string, string[]> = {
  restaurant: ['Peça uma mesa', 'Pergunte sobre o cardapio', 'Peça a conta'],
  airport: ['Faça check-in', 'Pergunte sobre o portao', 'Peça ajuda com a bagagem'],
  job_interview: ['Fale sobre experiencia', 'Pergunte sobre a empresa', 'Mostre suas habilidades'],
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

function sortTopicsForLevel(topics: ConversationTopic[], userLevel: string) {
  return [...topics].sort((a, b) => {
    const aDistance = Math.abs(englishLevelIndex(topicLevels[a.id] || 'A1') - englishLevelIndex(userLevel));
    const bDistance = Math.abs(englishLevelIndex(topicLevels[b.id] || 'A1') - englishLevelIndex(userLevel));
    return aDistance - bDistance;
  });
}

function topicLabel(topic: ConversationTopic) {
  return topic.name.replace(/^\S+\s*/, '');
}

export function ConversationTab({ user, onProfileRefresh }: ConversationTabProps) {
  const [topics, setTopics] = useState<ConversationTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<ConversationTopic | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([]);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const recommendedTopics = useMemo(() => sortTopicsForLevel(topics, englishLevel), [topics, englishLevel]);

  const aiRemaining = useMemo(() => {
    if (user.subscription_active) return Infinity;
    return Math.max(0, 10 - Number(user.ai_uses_today || 0));
  }, [user.ai_uses_today, user.subscription_active]);

  useEffect(() => {
    let isMounted = true;

    async function loadTopics() {
      try {
        const result = await getConversationTopics();
        if (isMounted) setTopics(result);
      } catch {
        if (isMounted) setNotice('Nao foi possivel carregar topicos.');
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
    setMessages([
      {
        role: 'assistant',
        content: `Hi! Welcome to ${topicLabel(topic)}. Let's practice in English.`
      }
    ]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !activeTopic || isSending) return;

    const nextMessages: ConversationMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setNotice('');
    setIsSending(true);

    try {
      const reply = await sendConversationMessage(activeTopic.id, trimmed, nextMessages, englishLevel);
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
      onProfileRefresh({ ...user, ai_uses_today: Number(user.ai_uses_today || 0) + 1 });
    } catch (error) {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: error instanceof Error ? `Erro: ${error.message}` : 'Erro na conversa.' }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function closeConversation() {
    if (activeTopic && messages.filter((message) => message.role === 'user').length > 0) {
      try {
        const errors = await analyzeGrammar(activeTopic.id, messages);
        setGrammarErrors(errors);
      } catch {
        setGrammarErrors([]);
      }
    }

    setActiveTopic(null);
  }

  if (!activeTopic) {
    return (
      <section className="conversation-layout" aria-label="Conversar">
        <header className="conversation-hero">
          <p className="kicker">Conversar</p>
          <h1>Pratique ingles em cenarios reais</h1>
          <p className="lead">
            Contextos e respostas ajustados para {englishLevel}. A IA conduz a conversa e pode analisar erros gramaticais ao final.
          </p>
          <div className={aiRemaining <= 3 ? 'ai-counter warning' : 'ai-counter'}>
            {user.subscription_active ? 'Conversas ilimitadas' : `${aiRemaining}/10 usos de IA hoje`}
          </div>
        </header>

        {notice && <div className="form-success">{notice}</div>}

        {grammarErrors.length > 0 && (
          <section className="grammar-panel">
            <h2>Ultima analise</h2>
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
              <span>{topic.name.split(' ')[0]}</span>
              <strong>{topicLabel(topic)}</strong>
              <small>{topicLevels[topic.id]} · {hints[topic.id]?.[0] || 'Pratique ingles com IA'}</small>
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
        <button className="secondary-button" type="button" onClick={closeConversation}>
          Fechar e analisar
        </button>
      </header>

      <div className="hint-strip">{hints[activeTopic.id]?.[messages.length % hints[activeTopic.id].length]}</div>

      <div className="message-list" ref={messagesRef}>
        {messages.map((message, index) => (
          <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </article>
        ))}
        {isSending && <article className="message assistant">Digitando...</article>}
      </div>

      <form className="conversation-form" onSubmit={handleSubmit}>
        <input
          className="field"
          maxLength={2000}
          placeholder="Type your answer in English..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button className="primary-button" disabled={isSending || !input.trim()} type="submit">
          Enviar
        </button>
      </form>
    </section>
  );
}
