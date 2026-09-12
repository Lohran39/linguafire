const { shopBuySchema, validateBody } = require('../validation');
const { SHOP_ITEMS, purchase, mutateUser } = require('../services/shop-benefits');
function setupShopRoutes(app, deps = {}) {
  const { authenticateToken = (req, res, next) => next() } = deps;
  app.get('/api/shop', (_req, res) => res.json({ items: SHOP_ITEMS }));
  app.post('/api/shop/buy', authenticateToken, validateBody(shopBuySchema), async (req, res) => {
    try {
      const result = await mutateUser(deps, req.user.id, user => purchase(user, req.validatedBody.itemId));
      const { xp, lives, has_free_hint, xp_multiplier, xp_multiplier_until, streak_freeze_active } = result.user;
      res.json({ success: true, xp, lives, has_free_hint, xp_multiplier, xp_multiplier_until, streak_freeze_active, message: result.message });
    } catch (error) { res.status(error.status || 503).json({ error: error.message }); }
  });
  app.post('/api/shop/use-hint', authenticateToken, async (req, res) => {
    try {
      const result = await mutateUser(deps, req.user.id, user => {
        if (Number(user.has_free_hint || 0) < 1) {
          const error = new Error('Você não tem dicas disponíveis.'); error.status = 400; throw error;
        }
        return { updates: { has_free_hint: Number(user.has_free_hint) - 1 } };
      });
      res.json({ success: true, has_free_hint: result.user.has_free_hint });
    } catch (error) { res.status(error.status || 503).json({ error: error.message }); }
  });
}
module.exports = { setupShopRoutes, SHOP_ITEMS };
