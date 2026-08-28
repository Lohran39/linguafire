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

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Erro na conversa');
  }
  return data;
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
  const data = await parseJson<{ reply: string }>(
    await fetch('/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ topicId, message, history, englishLevel })
    })
  );

  return data.reply;
}

export async function analyzeGrammar(
  topicId: string,
  conversationHistory: ConversationMessage[]
): Promise<GrammarError[]> {
  const data = await parseJson<{ errors: GrammarError[] }>(
    await fetch('/api/grammar/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ topicId, conversationHistory })
    })
  );

  return data.errors || [];
}
