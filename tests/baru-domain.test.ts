import { describe, expect, it } from 'vitest';
import { makeReservationCode, normalizeWhatsapp, validateReservation } from '@/shared/baru-domain';
import { settings } from '@/lib/baru-data';

describe('domínio de reservas do Baru', () => {
  it('aceita uma solicitação válida', () => {
    expect(validateReservation({ date: '2099-09-24', time: '19:30', partySize: 2, customerName: 'Ana Clara', whatsapp: '(45) 99988-7766', note: '' }, settings)).toEqual([]);
  });

  it('rejeita passado, lotação inválida e observação grande', () => {
    const errors = validateReservation({ date: '2020-01-01', time: '25:99', partySize: 0, customerName: 'A', whatsapp: '123', note: 'x'.repeat(501) }, settings);
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });

  it('normaliza telefone brasileiro sem expor formatação na persistência', () => {
    expect(normalizeWhatsapp('(45) 99988-7766')).toBe('5545999887766');
  });

  it('rejeita datas de calendário impossíveis e gera códigos sem sufixo previsível curto', () => {
    expect(validateReservation({ date: '2026-02-31', time: '19:30', partySize: 2, customerName: 'Ana Clara', whatsapp: '5545999887766', note: '' }, settings)).toContain('Escolha uma data válida.');
    expect(makeReservationCode(123456789)).toMatch(/^BRU-[A-Z0-9]{8}$/);
  });
});
