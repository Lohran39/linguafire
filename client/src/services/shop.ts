import { createJsonParser } from './http';

export type ShopItem = {
  id: string;
  name: string;
  cost: number;
  type: 'consumable' | 'booster' | 'mystery';
};

export type ShopPurchase = {
  success: boolean;
  xp: number;
  lives?: number;
  streak_freeze_active?: number;
  has_free_hint?: number | boolean;
  xp_multiplier?: number;
  xp_multiplier_until?: number;
  titles?: string[];
  message: string;
  reward?: {
    type: string;
    amount?: number;
    message?: string;
  };
};

const parseJson = createJsonParser('Erro na loja');

export async function getShopItems(): Promise<ShopItem[]> {
  const data = await parseJson<{ items: ShopItem[] }>(await fetch('/api/shop', { credentials: 'include' }));
  return data.items || [];
}

export async function buyShopItem(itemId: string): Promise<ShopPurchase> {
  return parseJson<ShopPurchase>(
    await fetch('/api/shop/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ itemId })
    })
  );
}

export async function useLessonHint(): Promise<number> {
  const result = await parseJson<{ has_free_hint: number }>(await fetch('/api/shop/use-hint', { method: 'POST', credentials: 'include' }));
  return result.has_free_hint;
}
