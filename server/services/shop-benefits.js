const SHOP_ITEMS = [
  { id: 'free_hint', name: '💡 Dica de lição', cost: 30, type: 'consumable' },
  { id: 'xp_booster', name: '⚡ XP em dobro nas lições (24h)', cost: 150, type: 'booster' },
  { id: 'streak_freeze', name: '🧊 Proteger sequência', cost: 100, type: 'consumable' },
  { id: 'mystery_box', name: '🎁 Caixa de XP', cost: 75, type: 'mystery' }
];
function reject(message) { const error = new Error(message); error.status = 400; throw error; }
function purchase(user, itemId, now = Date.now(), random = Math.random) {
  const item = SHOP_ITEMS.find(item => item.id === itemId);
  if (!item) reject('Este item não está disponível.');
  if (Number(user.xp || 0) < item.cost) reject('XP insuficiente.');
  const updates = { xp: Number(user.xp || 0) - item.cost };
  let message = `${item.name} comprado!`;
  if (itemId === 'free_hint') updates.has_free_hint = Number(user.has_free_hint || 0) + 1;
  if (itemId === 'xp_booster') {
    if (Number(user.xp_multiplier_until || 0) > now && user.xp_multiplier === 2) reject('Você já tem um bônus ativo.');
    updates.xp_multiplier = 2; updates.xp_multiplier_until = now + 86400000;
  }
  if (itemId === 'streak_freeze') {
    if (user.streak_freeze_active) reject('Sua proteção já está ativa.');
    updates.streak_freeze_active = 1;
  }
  if (itemId === 'mystery_box') {
    const roll = random();
    const amount = roll < 0.6 ? 50 : roll < 0.9 ? 100 : 200;
    updates.xp += amount; message = `Caixa aberta: +${amount} XP (custo: 75 XP).`;
  }
  return { updates, message };
}
function lessonXp(user, base, now = Date.now()) {
  return base * (user.xp_multiplier === 2 && Number(user.xp_multiplier_until) > now ? 2 : 1);
}
function studyDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function streakUpdates(user, today = studyDay()) {
  const previous = user.last_study_date;
  if (previous && previous >= today) return {};
  const gap = previous ? Math.round((Date.parse(today) - Date.parse(previous)) / 86400000) : 0;
  const updates = { last_study_date: today };
  if (!previous) updates.streak = Math.max(1, Number(user.streak || 0));
  else if (gap === 1) updates.streak = Number(user.streak || 0) + 1;
  else if (gap === 2 && user.streak_freeze_active) {
    updates.streak = Number(user.streak || 0) + 1;
    updates.streak_freeze_active = 0;
  } else updates.streak = 1;
  return updates;
}
// Conditional writes prevent two instances from spending the same balance.
async function mutateUser(deps, id, calculate) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const user = await deps.supabaseGetUserById(id);
    if (!user) throw new Error('Conta não encontrada.');
    const result = calculate(user);
    if (!Object.keys(result.updates).length) return { ...result, user };
    const write = await deps.supabaseCompareUpdateUser(id, result.updates, user);
    if (write.error) throw new Error('Não foi possível salvar. Tente novamente.');
    if (write.data) return { ...result, user: { ...user, ...result.updates } };
  }
  const error = new Error('Seu saldo mudou em outro dispositivo. Atualize e tente novamente.');
  error.status = 409; throw error;
}
module.exports = { SHOP_ITEMS, purchase, lessonXp, streakUpdates, studyDay, mutateUser };
