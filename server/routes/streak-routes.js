const { streakClaimSchema, validateBody } = require('../validation');

const STREAK_REWARDS = [
  { id: 'streak_7_mystery', type: 'mystery_box', streak: 7, message: '🎁 Caixa Misteriosa!' },
  { id: 'streak_30_title', type: 'title', streak: 30, titleId: 'mestre_perseveranca', titleName: 'Mestre da Perseverança', message: '🏆 Título: Mestre da Perseverança!' },
];

function getRandomReward() {
  const MYSTERY_REWARDS = [
    { type: 'xp', amount: 50, weight: 40, message: '+50 XP!' },
    { type: 'xp', amount: 100, weight: 25, message: '+100 XP!' },
    { type: 'xp', amount: 200, weight: 10, message: '+200 XP! SUPER!' },
    { type: 'lives', amount: 1, weight: 10, message: '+1 Vida Extra!' },
    { type: 'hint', amount: 1, weight: 10, message: '+1 Dica Grátis!' },
    { type: 'title', amount: 1, weight: 5, message: '🎉 Título "Caixeiro Voador" conquistado!' },
  ];

  const totalWeight = MYSTERY_REWARDS.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  for (const reward of MYSTERY_REWARDS) {
    random -= reward.weight;
    if (random <= 0) return reward;
  }
  return MYSTERY_REWARDS[0];
}

function setupStreakRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseGetUserById = async () => null,
    supabaseGetUserRewards = async () => [],
    supabaseAwardReward = async () => ({ error: 'not configured' }),
    supabaseUpdateUser = async () => ({ error: 'not configured' }),
    parseJsonField = (v, f) => f
  } = deps;

  // Get streak rewards
  app.get('/api/streak/rewards', authenticateToken, async (req, res) => {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(500).json({ error: 'Erro interno' });

      const currentStreak = user.streak;
      const rewards = STREAK_REWARDS.map(r => {
        const available = currentStreak >= r.streak;
        return { ...r, available };
      });

      const claimedRewards = await supabaseGetUserRewards(req.user.id);
      const claimed = new Set(claimedRewards.filter(r => r.claimed).map(r => r.reward_id));
      rewards.forEach(r => {
        r.claimed = claimed.has(r.id);
        r.canClaim = r.available && !r.claimed;
      });

      res.json({ rewards, currentStreak });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Claim streak reward
  app.post('/api/streak/claim', authenticateToken, validateBody(streakClaimSchema), async (req, res) => {
    const { rewardId } = req.validatedBody;
    const reward = STREAK_REWARDS.find(r => r.id === rewardId);
    if (!reward) return res.status(400).json({ error: 'Recompensa inválida' });

    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(500).json({ error: 'Erro interno' });

      if (user.streak < reward.streak) {
        return res.status(400).json({ error: 'Streak insuficiente' });
      }

      const claimedRewards = await supabaseGetUserRewards(req.user.id);
      const alreadyClaimed = claimedRewards.some(r => r.reward_id === rewardId && r.claimed);
      if (alreadyClaimed) return res.status(400).json({ error: 'Recompensa já reivindicada' });

      const updates = {};
      let message = reward.message;

      if (reward.type === 'mystery_box') {
        const boxReward = getRandomReward();
        if (boxReward.type === 'xp') {
          updates.xp = (user.xp || 0) + boxReward.amount;
          message = `🎁 Caixa Misteriosa aberta! ${boxReward.message}`;
        } else if (boxReward.type === 'lives') {
          updates.lives = Math.min(9, (user.lives || 5) + boxReward.amount);
          message = `🎁 Caixa Misteriosa aberta! +1 Vida!`;
        }
      } else if (reward.type === 'title') {
        const titles = parseJsonField(user.titles, []);
        if (!titles.includes(reward.titleId)) {
          titles.push(reward.titleId);
          updates.titles = JSON.stringify(titles);
        }
      }

      await supabaseAwardReward(req.user.id, reward.id, reward.type, { streak_threshold: reward.streak });

      if (Object.keys(updates).length > 0) {
        await supabaseUpdateUser(req.user.id, updates);
      }

      res.json({ success: true, message, updates });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao reclamar' });
    }
  });
}

module.exports = { setupStreakRoutes, STREAK_REWARDS };