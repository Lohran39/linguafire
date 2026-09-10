function errorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const body = data as { message?: unknown; error?: unknown };
  for (const value of [body.message, body.error]) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

export function createJsonParser(fallbackMessage: string) {
  return async function parseJson<T>(response: Response): Promise<T> {
    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      // Preserve cancellation so callers can distinguish a timeout from a server error.
      if (error instanceof Error && error.name === 'AbortError') throw error;
      throw new Error(fallbackMessage);
    }

    if (!response.ok) throw new Error(errorMessage(data, fallbackMessage));
    if (!data || typeof data !== 'object') throw new Error(fallbackMessage);
    return data as T;
  };
}
