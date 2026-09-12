import { useEffect, useState } from 'react';
import { buyShopItem, getShopItems, type ShopItem } from '../services/shop';
import type { UserProfile } from '../services/auth';

type ShopTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

const descriptions: Record<string, string> = {
  extra_life: '+1 vida, até o máximo de 9',
  free_hint: 'Libera a explicação de uma questão antes de responder. Use na aba Lições.',
  xp_booster: 'Dobra o XP das lições salvas nas próximas 24 horas.',
  streak_freeze: 'Preserva a sequência ao pular um dia. Ativação automática no próximo exercício, no horário de Brasília.',
  all_lives: 'Restaura vidas ao máximo',
  mystery_box: '60% de chance de 50 XP, 30% de 100 XP e 10% de 200 XP. Pode devolver menos que o custo.'
};

function splitName(name: string) {
  const [icon, ...rest] = name.trim().split(/\s+/);
  return {
    icon: icon || 'Loja',
    title: rest.join(' ') || name
  };
}

export function ShopTab({ user, onProfileRefresh }: ShopTabProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [notice, setNotice] = useState('');
  const [buyingId, setBuyingId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        const result = await getShopItems();
        if (isMounted) setItems(result.filter(item => !['extra_life', 'all_lives'].includes(item.id)));
      } catch (error) {
        if (isMounted) setNotice(error instanceof Error ? error.message : 'Erro ao carregar loja.');
      }
    }

    loadItems();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleBuy(item: ShopItem) {
    setNotice('');
    setBuyingId(item.id);

    try {
      const purchase = await buyShopItem(item.id);
      onProfileRefresh({
        ...user,
        xp: purchase.xp,
        streak_freeze_active: purchase.streak_freeze_active ?? user.streak_freeze_active,
        lives: purchase.lives ?? user.lives,
        has_free_hint: purchase.has_free_hint ?? user.has_free_hint,
        xp_multiplier: purchase.xp_multiplier ?? user.xp_multiplier,
        xp_multiplier_until: purchase.xp_multiplier_until ?? user.xp_multiplier_until,
        titles: purchase.titles ?? user.titles
      });
      setNotice(purchase.reward?.message || purchase.message || 'Compra realizada.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao comprar item.');
    } finally {
      setBuyingId('');
    }
  }

  return (
    <section className="shop-layout" aria-label="Loja">
      <header className="shop-hero">
        <p className="kicker">Loja</p>
        <h1>Troque XP por benefícios</h1>
        <p className="lead">O XP usado na compra sai do seu saldo. Seu nível de inglês não muda.</p>
        <div className="shop-balance">
          <span>{user.xp || 0}</span>
          <strong>XP disponível</strong>
        </div>
        <p>Dicas disponíveis: {Number(user.has_free_hint || 0)} · Proteção: {user.streak_freeze_active ? 'ativa' : 'inativa'}</p>
        {user.xp_multiplier === 2 && Number(user.xp_multiplier_until || 0) > Date.now() && <p>XP em dobro nas lições até {new Date(Number(user.xp_multiplier_until)).toLocaleString('pt-BR')}.</p>}
      </header>

      {notice && <div className="form-success">{notice}</div>}

      <div className="shop-grid">
        {items.map((item) => {
          const name = splitName(item.name);
          const active = item.id === 'streak_freeze' ? Boolean(user.streak_freeze_active) : item.id === 'xp_booster' && user.xp_multiplier === 2 && Number(user.xp_multiplier_until || 0) > Date.now();
          const canBuy = Number(user.xp || 0) >= item.cost && !active;
          return (
            <article className="shop-card" key={item.id}>
              <div className="shop-icon">{name.icon}</div>
              <div>
                <h2>{name.title}</h2>
                <p>{descriptions[item.id] || item.type}</p>
              </div>
              <div className="shop-card-footer">
                <strong>{item.cost} XP</strong>
                <button
                  className="primary-button"
                  disabled={!canBuy || Boolean(buyingId)}
                  type="button"
                  onClick={() => handleBuy(item)}
                >
                  {buyingId === item.id ? 'Comprando...' : active ? 'Já ativo' : canBuy ? 'Comprar' : 'XP insuficiente'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
