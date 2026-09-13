import { flushLearningEvents } from '../services/learning';
import { StudyTips } from './StudyTips';
import { LearningPanel } from './LearningPanel';
import { FireMark, StudyArtwork } from './StudyArtwork';
import { useEffect, useMemo, useState } from 'react';
import { APP_LEVELS, LEVEL_PROFILES, getLevelProgress, normalizeEnglishLevel } from '../data/levels';
import {
  claimStreakReward,
  getDailyWord,
  getLeaderboard,
  getQuests,
  getRank,
  getStreakRewards,
  type DailyWord,
  type LeaderboardUser,
  type Quest,
  type StreakReward
} from '../services/dashboard';
import type { UserProfile } from '../services/auth';

type HomeDashboardProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
  onLoadProfile: () => Promise<UserProfile>;
  onNavigate: (tab: 'lessons' | 'music' | 'flashcard' | 'conversation' | 'natives' | 'placement') => void;
  lastStudyTab: string;
};

function getStreakMessage(streak: number) {
  const messages = [
    ['Comece sua ofensiva', 'Estude hoje para não perder ritmo.'],
    ['1 dia. Continue amanhã', 'A rotina começa pequena.'],
    ['2 dias. Quase lá', 'Falta pouco para engrenar.'],
    ['Trio completo', 'Três dias já viram sinal de consistência.'],
    [`${streak} dias ativos`, 'Você está construindo uma sequência forte.']
  ];
  return messages[Math.min(streak, messages.length - 1)];
}

function formatRank(position: number | null) {
  if (!position) return '-';
  return `#${position}`;
}

export function HomeDashboard({ user, onProfileRefresh, onLoadProfile, onNavigate, lastStudyTab }: HomeDashboardProps) {
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [ranking, setRanking] = useState<LeaderboardUser[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [rewards, setRewards] = useState<StreakReward[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questTab, setQuestTab] = useState<'daily' | 'weekly'>('daily');
  const [notice, setNotice] = useState('');
  const [loadingRewardId, setLoadingRewardId] = useState('');

  const progress = useMemo(() => getLevelProgress(user.level || 1, user.xp || 0), [user.level, user.xp]);
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const levelProfile = LEVEL_PROFILES[englishLevel];
  const studyLabels = { lessons: 'Lições', music: 'Música', flashcard: 'Revisão', conversation: 'Conversa', natives: 'Nativos', placement: 'Nivelamento' };
  const resumeTab = !user.placement_completed ? 'placement' : Object.hasOwn(studyLabels, lastStudyTab) ? lastStudyTab as keyof typeof studyLabels : 'lessons';
  const [streakTitle, streakCopy] = getStreakMessage(user.streak || 0);
  const visibleRanking = ranking.slice(0, 5);
  const userInVisibleRanking = visibleRanking.some((player) => String(player.id || '') === String(user.id));
  const claimableRewards = rewards.filter((reward) => reward.canClaim);
  const visibleQuests = quests.filter((quest) => quest.type === questTab || (!quest.type && questTab === 'daily'));

  function getQuestProgress(quest: Quest) {
    if (quest.quest === 'lessons') return Number(user.lessons_completed || 0);
    if (quest.quest === 'correct') return Number(user.correct_answers || 0);
    if (quest.quest === 'streak') return Number(user.streak || 0);
    if (quest.quest === 'xp') return Number(user.xp || 0);
    return 0;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      await flushLearningEvents(user.id);
      const [wordResult, rankingResult, rankResult, rewardResult, questResult, profileResult] = await Promise.allSettled([
        getDailyWord(),
        getLeaderboard(),
        getRank(),
        getStreakRewards(),
        getQuests(),
        onLoadProfile()
      ]);

      if (!isMounted) return;
      if (profileResult.status === 'fulfilled') onProfileRefresh(profileResult.value);

      if (wordResult.status === 'fulfilled') setDailyWord(wordResult.value);
      if (rankingResult.status === 'fulfilled') setRanking(rankingResult.value);
      if (rankResult.status === 'fulfilled') setRank(rankResult.value);
      if (rewardResult.status === 'fulfilled') setRewards(rewardResult.value);
      if (questResult.status === 'fulfilled') setQuests(questResult.value);
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleClaimReward(rewardId: string) {
    setNotice('');
    setLoadingRewardId(rewardId);

    try {
      const message = await claimStreakReward(rewardId);
      const freshProfile = await onLoadProfile();
      onProfileRefresh(freshProfile);
      setRewards(await getStreakRewards());
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao resgatar recompensa.');
    } finally {
      setLoadingRewardId('');
    }
  }

  return (
    <section className="home-layout" aria-label="Inicio">
      <div className="home-main">
        <section className="welcome-panel">
          <p className="home-greeting">Olá, {user.name || 'estudante'}</p>
          <h1>{user.placement_completed ? 'Continue seu estudo.' : 'Seu inglês começa aqui.'}</h1>
          <p className="lead">{user.placement_completed ? `${studyLabels[resumeTab]} · Inglês ${englishLevel}. Um passo de cada vez.` : 'Descubra seu nível para receber atividades que combinam com você.'}</p>
          <button className="primary-button home-continue" type="button" onClick={() => onNavigate(resumeTab)}>{user.placement_completed ? `Continuar: ${studyLabels[resumeTab]}` : 'Descobrir meu nível'} <span aria-hidden="true">→</span></button>

          <div className="learning-path-panel">
            <span>{englishLevel}</span>
            <div>
              <strong>Inglês {englishLevel} · {levelProfile.title}</strong>
              <p>{levelProfile.focus}</p>
            </div>
          </div>

        </section>

        <section className="home-discover" aria-label="Sugestões de estudo">
          <div className="panel-heading"><h2>Explore no seu ritmo</h2><span>Inglês {englishLevel}</span></div>
          <div className="home-discover-grid">
            <button type="button" onClick={() => onNavigate('lessons')}><StudyArtwork scene="lessons" /><strong>Uma lição por vez</strong><span>{levelProfile.focus}</span></button>
            <button type="button" onClick={() => onNavigate('music')}><span className="home-music-art" aria-hidden="true">♫<i /><i /><i /><i /><i /></span><strong>Aprenda com música</strong><span>Ouça, acompanhe e descubra expressões.</span></button>
            <button type="button" onClick={() => onNavigate('conversation')}><StudyArtwork scene={englishLevel.startsWith('A') ? 'restaurant' : 'job_interview'} /><strong>Uma conversa real</strong><span>Pratique situações no seu nível.</span></button>
          </div>
        </section>
        <StudyTips key={`${user.id}:${englishLevel}:${user.placement_completed}`} level={englishLevel} assessed={Boolean(user.placement_completed)} />

        <div className="metric-grid">
          <article className="metric-card">
            <span>{user.xp || 0}</span>
            <strong>XP total</strong>
          </article>
          <article className="metric-card">
            <span>{user.streak || 0}</span>
            <strong>Sequência</strong>
          </article>
          <article className="metric-card">
            <span>{user.correct_answers || 0}</span>
            <strong>Acertos</strong>
          </article>
          <article className="metric-card">
            <span>{formatRank(rank)}</span>
            <strong>Ranking</strong>
          </article>
        </div>

        <LearningPanel userId={user.id} />

        <details className="home-extras"><summary><FireMark /> Missões e recompensas</summary>
        <div className="level-panel">
          <div><strong>Nível de jogo {user.level || 1} · {progress.current.name}</strong><span>{user.xp || 0}/{progress.nextXp} XP</span></div>
          <div className="progress-track" aria-label={`Progresso ${progress.percent}%`}><div style={{ width: `${progress.percent}%` }} /></div>
        </div>
        <section className="streak-panel">
          <div className="streak-number">
            <span>{user.streak || 0}</span>
            <small>dias</small>
          </div>
          <div className="streak-copy">
            <h2>{streakTitle}</h2>
            <p>{streakCopy}</p>
            <div className="streak-dots" aria-label="Sequência da semana">
              {Array.from({ length: 7 }, (_, index) => (
                <i className={index < (user.streak || 0) ? 'done' : ''} key={index} />
              ))}
            </div>
          </div>
        </section>

        {claimableRewards.length > 0 && (
          <section className="reward-panel">
            <div>
              <h2>Recompensas prontas</h2>
              <p>Seu streak liberou bônus para resgate.</p>
            </div>
            {claimableRewards.map((reward) => (
              <button
                className="primary-button"
                disabled={loadingRewardId === reward.id}
                key={reward.id}
                type="button"
                onClick={() => handleClaimReward(reward.id)}
              >
                {loadingRewardId === reward.id ? 'Resgatando...' : reward.message}
              </button>
            ))}
          </section>
        )}

        <section className="quests-panel">
          <div className="panel-heading">
            <h2>Missões</h2>
            <div className="mode-switch compact" aria-label="Tipo de missão">
              <button className={questTab === 'daily' ? 'active' : ''} type="button" onClick={() => setQuestTab('daily')}>
                Diárias
              </button>
              <button className={questTab === 'weekly' ? 'active' : ''} type="button" onClick={() => setQuestTab('weekly')}>
                Semanais
              </button>
            </div>
          </div>
          {visibleQuests.length ? (
            <div className="quest-list">
              {visibleQuests.map((quest) => {
                const current = getQuestProgress(quest);
                const target = Math.max(quest.target || 1, 1);
                const percent = Math.min(100, Math.round((current / target) * 100));
                return (
                  <article className={current >= target ? 'quest-card completed' : 'quest-card'} key={quest.id}>
                    <div>
                      <strong>{quest.title}</strong>
                      <small>{quest.desc}</small>
                    </div>
                    <span>+{quest.reward} XP</span>
                    <div className="progress-track" aria-label={`${percent}%`}>
                      <div style={{ width: `${percent}%` }} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-inline">Sem missões {questTab === 'daily' ? 'diárias' : 'semanais'} agora.</div>
          )}
        </section>

        </details>
        {notice && <div className="form-success">{notice}</div>}
      </div>

      <aside className="home-side">
        <section className="side-panel">
          <div className="panel-heading">
            <h2>Palavra do dia</h2>
            <span>{dailyWord?.level || '--'}</span>
          </div>
          <strong className="daily-word">{dailyWord?.word || 'Carregando...'}</strong>
          <p>{dailyWord?.translation || 'Buscando vocabulário diário.'}</p>
          {dailyWord?.context && <small>{dailyWord.context}</small>}
        </section>

        <section className="side-panel">
          <div className="panel-heading">
            <h2>Top XP</h2>
            <span>{APP_LEVELS.length} níveis</span>
          </div>
          {visibleRanking.length ? (
            <div className="ranking-list">
              {visibleRanking.map((player, index) => (
                <div className={String(player.id || '') === String(user.id) ? 'ranking-row current' : 'ranking-row'} key={`${player.id || player.name}-${index}`}>
                  <span>{index + 1}</span>
                  <strong>{player.name || 'Estudante'}</strong>
                  <small>{player.xp || 0} XP</small>
                </div>
              ))}
              {!userInVisibleRanking && rank && (
                <div className="ranking-row current">
                  <span>{rank}</span>
                  <strong>{user.name || 'Você'}</strong>
                  <small>{user.xp || 0} XP</small>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-inline">Ranking será exibido quando houver usuários com XP.</div>
          )}
        </section>
      </aside>
    </section>
  );
}
