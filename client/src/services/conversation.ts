export type ConversationTopic = {
  id: 'restaurant' | 'airport' | 'job_interview' | 'small_talk' | 'shopping';
  name: string;
};

export type ConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type GrammarError = {
  error?: string;
  incorrect?: string;
  correct?: string;
  type?: string;
};

const CONVERSATION_TIMEOUT_MS = 25000;
const GRAMMAR_ANALYZE_TIMEOUT_MS = 20000;

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Erro na conversa');
  }
  return data;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function getConversationTopics(): Promise<ConversationTopic[]> {
  const data = await parseJson<{ topics: ConversationTopic[] }>(await fetch('/api/conversation/topics'));
  return data.topics || [];
}

export async function sendConversationMessage(
  topicId: ConversationTopic['id'],
  message: string,
  history: ConversationMessage[],
  englishLevel?: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONVERSATION_TIMEOUT_MS);

  try {
    const data = await parseJson<{ reply: string }>(
      await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ topicId, message, history, englishLevel })
      })
    );

    return data.reply;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('A IA demorou demais para responder. Tente enviar de novo.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function formulateConversationResponse(
  topicId: ConversationTopic['id'],
  history: ConversationMessage[],
  englishLevel?: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONVERSATION_TIMEOUT_MS);

  try {
    const data = await parseJson<{ suggestion: string }>(
      await fetch('/api/conversation/formulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ topicId, history, englishLevel })
      })
    );

    return data.suggestion;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('A IA demorou demais para formular a resposta.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function analyzeGrammar(
  topicId: string,
  conversationHistory: ConversationMessage[]
): Promise<GrammarError[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), GRAMMAR_ANALYZE_TIMEOUT_MS);

  try {
    const data = await parseJson<{ errors: GrammarError[] }>(
      await fetch('/api/grammar/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ topicId, conversationHistory })
      })
    );

    return data.errors || [];
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('A análise demorou demais. Tente novamente depois.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
