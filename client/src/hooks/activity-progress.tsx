import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { loadActivities, saveActivity, readPendingDrafts, reconcileDrafts, sameDraft, restoreActivityValue, type ActivityEntry as Entry } from '../services/activity-drafts';
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
        const revision = await saveActivity(activity, JSON.parse(state), entry.revision);
        if (revision === null) {
          // Navigation is a preference, not an exercise answer. Rebase only this
          // entry so switching tabs on another device never blocks study drafts.
          if (activity === 'navigation') {
            const latest = await loadActivities();
            entry.revision = latest.find(item => item.activity === activity)?.revision || 0;
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
        entry.revision = revision;
        if (sameDraft(entry.state, JSON.parse(state))) store.dirty.delete(activity);
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
        const remote = await loadActivities();
        if (cancelled) return;
        let pending: Record<string, Entry> = {};
        try { pending = readPendingDrafts(localStorage.getItem(key)); } catch { /* Storage may be unavailable. */ }
        const next = reconcileDrafts(remote, pending);
        // Archive before replacing pending work. If storage fails, retain the original cache.
        for (const entry of next.conflicts) {
          localStorage.setItem(`${key}:conflict:${entry.activity}:${Date.now()}`, JSON.stringify(entry));
        }
        store.entries = next.entries;
        store.dirty = next.dirty;
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

export function useActivityState<T>(activity: string, name: string, initial: T | (() => T), validate?: (value: unknown) => boolean): [T, Dispatch<SetStateAction<T>>] {
  const store = useContext(Context);
  const [value, setValue] = useState<T>(() => {
    const entry = store?.entries[activity];
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
    const restored = restoreActivityValue(entry?.state[name], fallback, validate);
    if (store) {
      store.entries[activity] ||= { activity, revision: 0, state: { version: 1 } };
      store.entries[activity].state[name] = restored;
    }
    return restored;
  });
  const current = useRef(value);
  const set: Dispatch<SetStateAction<T>> = useCallback(next => {
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current.current) : next;
    if (sameDraft(current.current, resolved)) return;
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
