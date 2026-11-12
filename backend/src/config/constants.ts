// Business constants in one place (see docs/business-rules.md).
export const SIGNUP_BONUS = 100;
export const MAX_ACTIVE_ROOMS_PER_USER = 3;
export const ROOM_MAX_CAPACITY = 50;
export const ROOM_MIN_CAPACITY = 2;
export const ROOM_DELETE_WHEN_EMPTY_MINUTES = 30;
export const GLOBAL_ROOM_KEY = 'main';
export const GLOBAL_ROOM_CHIPS = [1, 5, 10, 25, 100];
export const GLOBAL_ROOM_MAX_PER_TARGET = 500;
export const ALLOWED_CHIPS = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
export const MAX_PER_TARGET_RANGE = { min: 10, max: 5000 };
export const TIMING_RANGE = {
  betSeconds: { min: 8, max: 120 },
  spinSeconds: { min: 3, max: 15 },
  resultSeconds: { min: 3, max: 20 },
};

export interface CoinPackage {
  id: string;
  name: string;
  coins: number; // coins credited, bonus included
  baseCoins: number;
  bonusPercent: number;
  priceCents: number; // display price only, nobody is charged
  highlight?: 'popular' | 'best-value';
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'starter', name: 'Starter', baseCoins: 500, bonusPercent: 0, coins: 500, priceCents: 99 },
  { id: 'popular', name: 'Popular', baseCoins: 1500, bonusPercent: 10, coins: 1650, priceCents: 299, highlight: 'popular' },
  { id: 'value', name: 'Value', baseCoins: 5000, bonusPercent: 20, coins: 6000, priceCents: 799 },
  { id: 'pro', name: 'Pro', baseCoins: 20000, bonusPercent: 25, coins: 25000, priceCents: 2499, highlight: 'best-value' },
  { id: 'vip', name: 'VIP', baseCoins: 100000, bonusPercent: 30, coins: 130000, priceCents: 9999 },
];
