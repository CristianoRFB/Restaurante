import { describe, expect, it } from 'vitest';
import { BARU_LEAD_NAME, BARU_SOURCE_URL, foodSlug, newFoodDemoTenant, newFoodLead } from '@/shared/food-platform-domain';

const now = '2026-10-27T12:00:00.000Z';

describe('Food: lead comercial separado de tenant demo', () => {
  it('registra Baru como não convertido sem credenciais, cobrança ou autorização inventada', () => {
    const lead = newFoodLead(BARU_LEAD_NAME, 'repositorio_legado', BARU_SOURCE_URL, now);
    expect(lead).toMatchObject({
      id: 'baru-gastronomia', status: 'NAO_CONVERTIDO',
      contractStatus: 'NOT_SIGNED', brandingAuthorization: 'UNCONFIRMED',
      vertical: 'FOOD',
    });
    expect(lead).not.toHaveProperty('customerUid');
    expect(lead).not.toHaveProperty('subscriptionStatus');
  });
  it('cria demo interna não publicada e não copia marca do prospect para a vitrine', () => {
    const lead = newFoodLead(BARU_LEAD_NAME, 'repositorio_legado', BARU_SOURCE_URL, now);
    const demo = newFoodDemoTenant(lead, now);
    expect(demo).toMatchObject({ slug: 'baru-gastronomia-demo', kind: 'DEMO', status: 'DEMO', subscriptionStatus: 'demo', publiclyListed: false, linkedLeadId: lead.id });
    expect(demo.branding.name).not.toContain('Baru');
  });
  it('não admite slugs perigosos, URLs não seguras ou campos vazios', () => {
    expect(() => foodSlug('admin')).toThrow();
    expect(() => foodSlug('../')).toThrow();
    expect(() => newFoodLead('A', 'cadastro_manual', '', now)).toThrow();
    expect(() => newFoodLead('Exemplo', 'cadastro_manual', 'http://example.com', now)).toThrow();
  });
});
