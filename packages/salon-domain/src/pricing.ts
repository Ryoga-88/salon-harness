import type { Menu } from '@salon-harness/shared';

export function calculateMenuTotals(menus: Pick<Menu, 'duration_min' | 'price'>[]): {
  durationMin: number;
  price: number;
} {
  return menus.reduce(
    (acc, menu) => ({
      durationMin: acc.durationMin + menu.duration_min,
      price: acc.price + menu.price
    }),
    { durationMin: 0, price: 0 }
  );
}
