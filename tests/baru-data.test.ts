import { describe, expect, it } from 'vitest';
import { categories, menuItems, moments, reservations } from '@/lib/baru-data';

describe('dados demo do Baru', () => {
  it('mantém os três Momentos do Baru configuráveis', () => {
    expect(moments.map((moment) => moment.id)).toEqual(['cafe', 'a-la-carte', 'happy-hour']);
    expect(moments.every((moment) => moment.active)).toBe(true);
  });

  it('mantém itens ligados a categorias existentes e preços inteiros', () => {
    const categoryIds = new Set(categories.map((category) => category.id));
    expect(menuItems.every((item) => categoryIds.has(item.categoryId) && Number.isSafeInteger(item.priceCents) && item.priceCents >= 0)).toBe(true);
  });

  it('usa apenas status de reserva conhecidos', () => {
    expect(reservations.every((reservation) => ['NEW', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(reservation.status))).toBe(true);
  });
});
