import { describe, expect, it } from 'vitest';
import { calculateCartPreview, calculateItemPrice, ORDER_TRANSITIONS, type OrderCatalog } from '@/shared/order-domain';
import { getStoreAvailability, type RestaurantSettings } from '@/shared/baru-domain';

const catalog: OrderCatalog = {
  items: [{ id: 'prato-1', name: 'Prato real', description: 'Descrição', categoryId: 'cat-1', priceCents: 2400, imageUrl: 'https://images.example.com/prato.jpg', active: true, featured: false, displayOrder: 0, serviceMomentIds: [], sizes: [{ id: 'small', label: 'Pequeno', basePriceCents: 2400, active: true }, { id: 'large', label: 'Grande', basePriceCents: 3200, active: true }], modifierGroupIds: ['group-1'] }],
  groups: [{ id: 'group-1', name: 'Complementos', active: true, required: false, minSelections: 0, maxSelections: 2, allowDuplicate: false, modifierIds: ['mod-1', 'mod-2'] }],
  modifiers: [{ id: 'mod-1', name: 'Molho', active: true, available: true, priceCents: 300 }, { id: 'mod-2', name: 'Farofa', active: true, available: true, priceCents: 500 }],
};

describe('domínio de pedidos internos', () => {
  const hours = { open: '12:00', close: '23:00', closed: false };
  const restaurantSettings = { timezone: 'America/Sao_Paulo', openingHours: { monday: hours, tuesday: hours, wednesday: hours, thursday: hours, friday: hours, saturday: hours, sunday: { open: '', close: '', closed: true } } } as RestaurantSettings;

  it('recalcula tamanho, adicional e quantidade a partir do catálogo', () => {
    const preview = calculateCartPreview([{ cartItemId: 'cart-1', productId: 'prato-1', sizeId: 'large', selections: [{ groupId: 'group-1', items: [{ modifierId: 'mod-1', quantity: 1 }] }], quantity: 2 }], catalog);
    expect(preview.subtotalCents).toBe(7000);
    expect(preview.items[0].unitPriceCents).toBe(3500);
  });

  it('não aceita produto inativo, adicional fora do grupo ou repetição proibida', () => {
    expect(() => calculateItemPrice({ cartItemId: 'cart-1', productId: 'produto-inexistente', sizeId: 'default', selections: [], quantity: 1 }, catalog)).toThrow('Produto indisponível');
    expect(() => calculateItemPrice({ cartItemId: 'cart-1', productId: 'prato-1', sizeId: 'small', selections: [{ groupId: 'group-1', items: [{ modifierId: 'mod-1', quantity: 2 }] }], quantity: 1 }, catalog)).toThrow('Não é possível repetir');
    expect(() => calculateItemPrice({ cartItemId: 'cart-1', productId: 'prato-1', sizeId: 'small', selections: [{ groupId: 'outro', items: [] }], quantity: 1 }, catalog)).toThrow('Grupo de adicionais inválido');
  });

  it('mantém o fluxo operacional sem permitir saltos de status', () => {
    expect(ORDER_TRANSITIONS.NEW).toEqual(['CONFIRMED', 'CANCELLED']);
    expect(ORDER_TRANSITIONS.PREPARING).toContain('READY');
    expect(ORDER_TRANSITIONS.COMPLETED).toEqual([]);
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('bloqueia pedidos fora do horário e informa a próxima abertura', () => {
    const open = getStoreAvailability(restaurantSettings, new Date('2026-09-22T13:00:00-03:00'));
    const closed = getStoreAvailability(restaurantSettings, new Date('2026-09-22T23:30:00-03:00'));
    expect(open.isOpen).toBe(true);
    expect(open.todayLabel).toBe('Aberto agora');
    expect(closed.isOpen).toBe(false);
    expect(closed.nextOpeningLabel).toContain('quarta-feira');
  });

  it('reconhece funcionamento que atravessa a meia-noite', () => {
    const overnight = { ...restaurantSettings, openingHours: { ...restaurantSettings.openingHours, tuesday: { open: '20:00', close: '02:00', closed: false }, wednesday: { open: '', close: '', closed: true } } };
    const availability = getStoreAvailability(overnight, new Date('2026-09-23T01:00:00-03:00'));
    expect(availability.isOpen).toBe(true);
  });
});
