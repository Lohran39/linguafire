import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

type Draft = { version: number; [key: string]: unknown };
type Entry = { activity: string; state: Draft; revision: number; updated_at?: string };
type Store = {
  entries: Record<string, Entry>;
  dirty: Set<string>;
  change: (activity: string) => void;
  save: () => Promise<void>;
};
const Context = createContext<Store | null>(null);

export function ActivityProgress({ userId, children }: { userId: string; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef(false);
  const blocked = useRef(false);
  const mounted = useRef(true);
  const loaded = useRef(false);
  const key = `linguafire-drafts-v1:${userId}`;
  const store = useRef<Store>({ entries: {}, dirty: new Set(), change: () => {}, save: async () => {} }).current;

  function cache() {
    if (!loaded.current) return true;
    try {
      const pending = Object.fromEntries([...store.dirty].map(activity => [activity, store.entries[activity]]));
      localStorage.setItem(key, JSON.stringify(pending));
      return true;
    } catch { return false; }
  }

  async function flush() {
    clearTimeout(timer.current);
    if (inFlight.current || blocked.current || !store.dirty.size) return;
    inFlight.current = true;
    try {
      for (const activity of [...store.dirty]) {
        const entry = store.entries[activity];
        const state = JSON.stringify(entry.state);
        const response = await fetch(`/api/activities/${activity}`, {
          method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: JSON.parse(state), revision: entry.revision }),
          signal: AbortSignal.timeout(12000)
        });
        if (response.status === 409) {
          // Navigation is a preference, not an exercise answer. Rebase only this
          // entry so switching tabs on another device never blocks study drafts.
          if (activity === 'navigation') {
            const latest = await fetch('/api/activities', { credentials: 'include', signal: AbortSignal.timeout(12000) });
            if (!latest.ok) throw new Error('Não foi possível sincronizar a navegação. Tente novamente.');
            const result = await latest.json() as { activities: Entry[] };
            entry.revision = result.activities.find(item => item.activity === activity)?.revision || 0;
            cache();
            continue;
          }
          blocked.current = true;
          if (!cache()) { blocked.current = false; throw new Error('Não foi possível preservar o rascunho neste navegador. Tente novamente.'); }
          loaded.current = false;
          store.dirty.clear();
          window.location.reload();
          return;
        }
        if (!response.ok) throw new Error('Sem sincronização. Suas alterações aguardam envio neste dispositivo.');
        const result = await response.json();
        entry.revision = result.revision;
        if (JSON.stringify(entry.state) === state) store.dirty.delete(activity);
        cache();
      }
      if (mounted.current) { setStatus(''); setFailed(false); }
    } catch (error) {
      if (mounted.current) {
        setFailed(true);
        setStatus(error instanceof Error ? error.message : 'Não foi possível sincronizar.');
      }
      return;
    } finally { inFlight.current = false; }
    if (store.dirty.size) timer.current = setTimeout(() => void flush(), 600);
  }

  store.save = flush;
  store.change = activity => {
    store.dirty.add(activity);
    const cached = cache();
    if (mounted.current && !blocked.current) setStatus(cached ? '' : 'Salvamento local indisponível · aguarde a sincronização antes de sair.');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 600);
  };

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/activities', { credentials: 'include', signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error('Não foi possível carregar suas atividades. Tente novamente para continuar com segurança.');
        const result = await response.json() as { activities: Entry[] };
        if (cancelled) return;
        store.entries = Object.fromEntries(result.activities.filter(entry => entry.state?.version === 1).map(entry => [entry.activity, entry]));
        let pending: Record<string, Entry> = {};
        try { pending = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* Cache opcional. */ }
        for (const [activity, entry] of Object.entries(pending)) {
          if (!entry?.state || entry.state.version !== 1) continue;
          const remote = store.entries[activity];
          if (remote && JSON.stringify(remote.state) === JSON.stringify(entry.state)) continue;
          if ((remote?.revision || 0) !== entry.revision) {
            if (activity === 'navigation') entry.revision = remote?.revision || 0;
            else {
              // Keep conflicting work locally without downloading or overwriting the account.
              localStorage.setItem(`${key}:conflict:${activity}:${Date.now()}`, JSON.stringify(entry));
              continue;
            }
          }
          store.entries[activity] = entry;
          store.dirty.add(activity);
        }
        loaded.current = true;
        cache();
        setReady(true);
        setFailed(false);
        setStatus('');
        void flush();
      } catch (error) {
        if (!cancelled) { setFailed(true); setStatus(error instanceof Error ? error.message : 'Falha ao carregar atividades.'); }
      }
    }
    void load();
    const online = () => void flush();
    const hide = () => { if (document.visibilityState === 'hidden') { cache(); void flush(); } };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (store.dirty.size) { cache(); event.preventDefault(); }
    };
    const periodicSave = window.setInterval(() => void flush(), 5000);
    window.addEventListener('online', online);
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', hide);
    return () => {
      cancelled = true;
      mounted.current = false;
      clearTimeout(timer.current);
      cache();
      window.clearInterval(periodicSave);
      window.removeEventListener('online', online);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [userId]);

  return <Context.Provider value={store}>
    {status && <div className={`activity-sync ${failed ? 'sync-error' : ''}`} role="status" aria-live="polite">
      <span>{status}</span>
      {failed && <button type="button" onClick={() => ready ? void flush() : window.location.reload()}>Tentar novamente</button>}
    </div>}
    {ready ? children : null}
  </Context.Provider>;
}

export function useActivityState<T>(activity: string, name: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const store = useContext(Context);
  const [value, setValue] = useState<T>(() => {
    const entry = store?.entries[activity];
    if (entry && Object.hasOwn(entry.state, name)) return entry.state[name] as T;
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
    if (store) {
      store.entries[activity] ||= { activity, revision: 0, state: { version: 1 } };
      store.entries[activity].state[name] = fallback;
    }
    return fallback;
  });
  const current = useRef(value);
  const set: Dispatch<SetStateAction<T>> = useCallback(next => {
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current.current) : next;
    if (Object.is(current.current, resolved) || JSON.stringify(current.current) === JSON.stringify(resolved)) return;
    current.current = resolved;
    setValue(resolved);
    if (store) {
      store.entries[activity].state[name] = resolved;
      store.change(activity);
    }
  }, [store, activity, name]);
  return [value, set];
}

export function useSaveBeforeLeave() {
  const store = useContext(Context);
  return async () => {
    await store?.save();
    return !store?.dirty.size;
  };
}
