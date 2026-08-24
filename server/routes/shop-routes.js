const { shopBuySchema, validateBody } = require('../validation');

const SHOP_ITEMS = [
  { id: 'extra_life', name: '❤️ Vida Extra', cost: 50, type: 'consumable' },
  { id: 'free_hint', name: '💡 Dica Grátis', cost: 30, type: 'consumable' },
  { id: 'xp_booster', name: '⚡ Dobrar XP (1 lição)', cost: 150, type: 'booster' },
  { id: 'streak_freeze', name: '🧊 Congelar Streak', cost: 100, type: 'consumable' },
  { id: 'all_lives', name: '💚 Vidas Cheias', cost: 200, type: 'consumable' },
  { id: 'mystery_box', name: '🎁 Caixa Misteriosa', cost: 75, type: 'mystery' },
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

function setupShopRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseGetUserById = async () => null,
    supabaseUpdateUser = async () => ({ error: 'not configured' }),
    parseJsonField = (v, f) => f
  } = deps;

  // Get shop items
  app.get('/api/shop', (req, res) => {
    res.json({ items: SHOP_ITEMS });
  });

  // Buy item
  app.post('/api/shop/buy', authenticateToken, validateBody(shopBuySchema), async (req, res) => {
    const { itemId } = req.validatedBody;
    const shopItem = SHOP_ITEMS.find(i => i.id === itemId);
    if (!shopItem) return res.status(400).json({ error: 'Item inválido' });

    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(500).json({ error: 'Erro interno' });
      if ((user.xp || 0) < shopItem.cost) return res.status(400).json({ error: 'XP insuficiente' });

      const newXP = (user.xp || 0) - shopItem.cost;
      const updates = { xp: newXP };
      let reward = null;

      if (itemId === 'extra_life') {
        updates.lives = Math.min(9, (user.lives || 5) + 1);
      } else if (itemId === 'all_lives') {
        updates.lives = 5;
      } else if (itemId === 'xp_booster') {
        updates.xp_multiplier = 2;
        updates.xp_multiplier_until = Date.now() + 24 * 60 * 60 * 1000;
      } else if (itemId === 'mystery_box') {
        reward = getRandomReward();
        if (reward.type === 'xp') {
          updates.xp = newXP + reward.amount;
        } else if (reward.type === 'lives') {
          updates.lives = Math.min(9, (user.lives || 5) + reward.amount);
        } else if (reward.type === 'hint') {
          updates.has_free_hint = (user.has_free_hint || 0) + reward.amount;
        } else if (reward.type === 'title') {
          const titles = parseJsonField(user.titles, []);
          if (!titles.includes('caixeiro_voador')) {
            titles.push('caixeiro_voador');
            updates.titles = JSON.stringify(titles);
          }
        }
      }

      await supabaseUpdateUser(req.user.id, updates);

      res.json({
        success: true,
        xp: updates.xp,
        lives: updates.lives || user.lives,
        has_free_hint: updates.has_free_hint ?? user.has_free_hint,
        xp_multiplier: updates.xp_multiplier ?? user.xp_multiplier,
        xp_multiplier_until: updates.xp_multiplier_until ?? user.xp_multiplier_until,
        titles: updates.titles ? parseJsonField(updates.titles, []) : parseJsonField(user.titles, []),
        message: reward ? reward.message : `${shopItem.name} comprado!`,
        reward
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao comprar' });
    }
  });
}

module.exports = { setupShopRoutes, SHOP_ITEMS };
