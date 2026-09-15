import { useEffect, useRef, useState } from 'react';
import { useActivityState } from './activity-progress';
import { getProfile, updateProfile } from '../services/profile';
import type { UserProfile } from '../services/auth';
import { createMusicReward, isMusicReward, type MusicReward } from '../services/music-reward';

export function useMusicReward(user: UserProfile, onProfileRefresh: (user: UserProfile) => void,
  run: string, complete: boolean, rewarded: boolean, setRewarded: (value: boolean) => void, xp: number, correct: number) {
  const [pending, setPending] = useActivityState<MusicReward | null>('music', 'pendingReward', null, isMusicReward);
  const [dismissedRun, setDismissedRun] = useActivityState('music', 'dismissedRewardRun', '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const attempted = useRef('');
  const latest = useRef({ user, onProfileRefresh, run, setRewarded });
  latest.current = { user, onProfileRefresh, run, setRewarded };

  async function save(request: MusicReward) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      // Retry the original preconditions. Rebasing after a lost response could award twice.
      const { run: _run, ...updates } = request;
      const saved = await updateProfile(updates);
      setPending(null);
      if (request.run === latest.current.run) latest.current.setRewarded(true);
      latest.current.onProfileRefresh({ ...latest.current.user, ...saved, xp: saved.xp ?? request.xp, correct_answers: request.correct_answers });
      void getProfile().then(profile => latest.current.onProfileRefresh(profile)).catch(() => {});
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar o XP. Tente novamente.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  useEffect(() => {
    const request = pending || (complete && !rewarded && dismissedRun !== run
      ? createMusicReward(run, Number(user.xp || 0), Number(user.correct_answers || 0), xp, correct) : null);
    if (!request || attempted.current === request.run) return;
    attempted.current = request.run;
    if (!pending) setPending(request);
    void save(request);
  }, [complete, rewarded, run, pending, user.xp, user.correct_answers, xp, correct, dismissedRun]);

  return { pending, busy, error, discarded: dismissedRun === run, discard: () => {
    if (busy || !pending) return;
    setDismissedRun(pending.run); setPending(null); setError('');
  }, retry: () => { if (pending) void save(pending); } };
}
