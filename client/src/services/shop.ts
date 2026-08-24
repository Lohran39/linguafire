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

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Erro na loja');
  }
  return data;
}

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
