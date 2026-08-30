import { useEffect, useState } from 'react';
import { buyShopItem, getShopItems, type ShopItem } from '../services/shop';
import type { UserProfile } from '../services/auth';

type ShopTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

const descriptions: Record<string, string> = {
  extra_life: '+1 vida, até o máximo de 9',
  free_hint: 'Dica grátis na próxima lição',
  xp_booster: 'XP em dobro por 24 horas',
  streak_freeze: 'Protege sua sequência por 1 dia',
  all_lives: 'Restaura vidas ao máximo',
  mystery_box: 'Recompensa surpresa'
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
        if (isMounted) setItems(result);
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
        <h1>Use XP para acelerar o estudo</h1>
        <p className="lead">Compre vidas, dicas, boosters e recompensas surpresa.</p>
        <div className="shop-balance">
          <span>{user.xp || 0}</span>
          <strong>XP disponível</strong>
        </div>
      </header>

      {notice && <div className="form-success">{notice}</div>}

      <div className="shop-grid">
        {items.map((item) => {
          const name = splitName(item.name);
          const canBuy = Number(user.xp || 0) >= item.cost;
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
                  disabled={!canBuy || buyingId === item.id}
                  type="button"
                  onClick={() => handleBuy(item)}
                >
                  {buyingId === item.id ? 'Comprando...' : canBuy ? 'Comprar' : 'XP insuficiente'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
