import type { Area, Customer, MenuCategory, MenuItem, RestaurantSettings, RestaurantTable, Reservation, ServiceMoment, SiteContent, TeamMember } from '@/shared/baru-domain';

const photos = {
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=85',
  table: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=85',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
  steak: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85',
  octopus: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
  dessert: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=85',
  cocktail: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85',
  chef: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1000&q=85',
  room: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=85',
};

export const settings: RestaurantSettings = {
  name: 'Baru Gastronomia',
  tagline: 'Boa comida aproxima pessoas.',
  city: 'Foz do Iguaçu · PR',
  address: 'Av. Paraná, 3515 · Jardim Central, Foz do Iguaçu · PR',
  whatsapp: '5545991125003',
  timezone: 'America/Sao_Paulo',
  maxPartySize: 20,
  reservationLeadHours: 2,
  reservationDurationMinutes: 120,
  confirmationMode: 'MANUAL',
  officialMenuUrl: 'https://cardapio.barugastronomia.com.br/',
  onlineOrderingUrl: 'https://www.ifood.com.br/delivery/ok-ok/ok/2f8d493e-c173-4669-899e-1483e9fffb12?UTM_Medium=share',
  openingHours: {
    monday: { open: '12:00', close: '23:00', closed: false },
    tuesday: { open: '12:00', close: '23:00', closed: false },
    wednesday: { open: '12:00', close: '23:00', closed: false },
    thursday: { open: '12:00', close: '23:00', closed: false },
    friday: { open: '12:00', close: '23:00', closed: false },
    saturday: { open: '12:00', close: '23:00', closed: false },
    sunday: { open: '', close: '', closed: true },
  },
  demoMode: true,
};

export const moments: ServiceMoment[] = [
  { id: 'cafe', name: 'Café', eyebrow: 'Comece bem o seu dia', description: 'Receitas afetivas e sabores que tornam a manhã mais significativa.', imageUrl: photos.coffee, active: true, displayOrder: 1 },
  { id: 'a-la-carte', name: 'À la Carte', eyebrow: 'Sabores sem fronteiras', description: 'Ingredientes frescos e uma cozinha que valoriza o encontro entre o local e o mundo.', imageUrl: photos.steak, active: true, displayOrder: 2 },
  { id: 'happy-hour', name: 'Happy Hour', eyebrow: 'Drinks, petiscos e bons encontros', description: 'Um convite para desacelerar, brindar e ficar mais um pouco.', imageUrl: photos.cocktail, active: true, displayOrder: 3 },
];

export const categories: MenuCategory[] = [
  { id: 'cafe', name: 'Café', subtitle: 'Comece bem o seu dia', active: true, displayOrder: 1 },
  { id: 'principais', name: 'À la Carte', subtitle: 'Sabores sem fronteiras', active: true, displayOrder: 2 },
  { id: 'happy-hour', name: 'Happy Hour', subtitle: 'Drinks e bons encontros', active: true, displayOrder: 3 },
  { id: 'sobremesas', name: 'Sobremesas', subtitle: 'Um final para lembrar', active: true, displayOrder: 4 },
];

export const menuItems: MenuItem[] = [
  { id: 'cappuccino-baru', name: 'Cappuccino Baru', description: 'Café especial, leite cremoso, notas de chocolate e canela.', categoryId: 'cafe', priceCents: 1800, imageUrl: photos.coffee, active: true, featured: true, displayOrder: 1, serviceMomentIds: ['cafe'] },
  { id: 'pao-queijo', name: 'Pão de Queijo Artesanal', description: 'Receita mineira com queijo canastra e toque de ervas.', categoryId: 'cafe', priceCents: 1600, imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=900&q=85', active: true, featured: false, displayOrder: 2, serviceMomentIds: ['cafe'] },
  { id: 'tapioca-casa', name: 'Tapioca da Casa', description: 'Recheio de queijo coalho, tomate confit e folhas frescas.', categoryId: 'cafe', priceCents: 2200, imageUrl: photos.table, active: true, featured: true, displayOrder: 3, serviceMomentIds: ['cafe'] },
  { id: 'polvo-brasa', name: 'Polvo na Brasa', description: 'Polvo grelhado, purê de batata-doce, chimichurri de ervas e redução cítrica.', categoryId: 'principais', priceCents: 8600, imageUrl: photos.octopus, active: true, featured: true, displayOrder: 1, serviceMomentIds: ['a-la-carte'] },
  { id: 'short-rib', name: 'Short Rib Sous-vide', description: 'Cozimento lento, molho de vinho tinto e mandioca cremosa.', categoryId: 'principais', priceCents: 7800, imageUrl: photos.steak, active: true, featured: true, displayOrder: 2, serviceMomentIds: ['a-la-carte'] },
  { id: 'risoto-cogumelos', name: 'Risoto de Cogumelos', description: 'Arroz arbóreo, mix de cogumelos, parmesão brasileiro e azeite de trufas.', categoryId: 'principais', priceCents: 6200, imageUrl: photos.table, active: true, featured: false, displayOrder: 3, serviceMomentIds: ['a-la-carte'] },
  { id: 'negroni', name: 'Negroni Clássico', description: 'Gin, vermute rosso, Campari e uma casca de laranja.', categoryId: 'happy-hour', priceCents: 4200, imageUrl: photos.cocktail, active: true, featured: false, displayOrder: 1, serviceMomentIds: ['happy-hour'] },
  { id: 'cheesecake-goiaba', name: 'Cheesecake de Goiaba', description: 'Nossa releitura de um clássico, com goiaba artesanal e farofa crocante.', categoryId: 'sobremesas', priceCents: 3200, imageUrl: photos.dessert, active: true, featured: true, displayOrder: 1, serviceMomentIds: ['cafe', 'a-la-carte'] },
];

export const areas: Area[] = [
  { id: 'salao', name: 'Salão Principal', active: true, displayOrder: 1 },
  { id: 'varanda', name: 'Varanda', active: true, displayOrder: 2 },
  { id: 'privativa', name: 'Sala Privativa', active: true, displayOrder: 3 },
  { id: 'bar', name: 'Bar', active: true, displayOrder: 4 },
];

export const tables: RestaurantTable[] = Array.from({ length: 12 }, (_, index) => ({
  id: `mesa-${String(index + 1).padStart(2, '0')}`,
  areaId: 'salao',
  name: `Mesa ${String(index + 1).padStart(2, '0')}`,
  capacity: index === 2 || index === 7 ? 2 : index === 6 ? 6 : 4,
  active: true,
  state: index === 1 ? 'OCCUPIED' : index === 3 || index === 10 ? 'RESERVED' : index === 7 ? 'MAINTENANCE' : 'AVAILABLE',
}));

const history = (status: Reservation['status'], label: string): Reservation['history'] => [{ id: 'history-1', status, label, createdAt: '2026-09-21T10:24:00-03:00', by: 'Mariana Costa' }];

export const customers: Customer[] = [
  { id: 'mariana-costa', name: 'Mariana Costa', whatsapp: '5545998765432', email: 'mariana.costa@email.com', tags: ['Recorrente', 'VIP'], preferences: ['Prefere mesa tranquila', 'Aprecia vinhos'], notes: 'Cliente muito simpática. Prefere mesas tranquilas, de longe da entrada.', importantDate: '08-12', reservationIds: ['res-0842', 'res-0846'], noShows: 0, lastVisit: '2026-09-14' },
  { id: 'rafael-mendes', name: 'Rafael Mendes', whatsapp: '5545998765432', email: 'rafael.mendes@email.com', tags: ['Recorrente'], preferences: ['Gosta de menu degustação'], notes: 'Cliente frequente.', reservationIds: ['res-0843'], noShows: 1, lastVisit: '2026-09-10' },
  { id: 'camila-oliveira', name: 'Camila Oliveira', whatsapp: '5545998123456', tags: ['Aniversariante'], preferences: ['Prefere área externa'], notes: 'Aniversário em 20/04.', reservationIds: ['res-0844'], noShows: 0, lastVisit: '2026-09-14' },
  { id: 'grupo-torres', name: 'Grupo Torres', whatsapp: '5545998776655', email: 'grupo.torres@email.com', tags: ['Corporativo'], preferences: ['Eventos'], notes: 'Clientes corporativos.', reservationIds: ['res-0845'], noShows: 2, lastVisit: '2026-09-08' },
  { id: 'lucas-ferreira', name: 'Lucas Ferreira', whatsapp: '5545998443322', tags: ['VIP'], preferences: ['Aprecia menu degustação'], notes: 'Ótima experiência no último atendimento.', reservationIds: ['res-0847'], noShows: 0, lastVisit: '2026-09-13' },
];

export const reservations: Reservation[] = [
  { id: 'res-0842', code: 'BRU-0842', date: '2026-09-21', time: '12:30', partySize: 4, customerId: 'mariana-costa', customerName: 'Mariana Costa', whatsapp: '5545998765432', note: 'Prefere mesa próxima à janela.', status: 'CONFIRMED', tableId: 'mesa-12', momentId: 'a-la-carte', source: 'SITE', history: history('CONFIRMED', 'Reserva confirmada'), createdAt: '2026-09-20T18:24:00-03:00', updatedAt: '2026-09-21T08:12:00-03:00' },
  { id: 'res-0843', code: 'BRU-0843', date: '2026-09-21', time: '13:00', partySize: 2, customerId: 'rafael-mendes', customerName: 'Rafael Mendes', whatsapp: '5545998765432', note: 'Comemoração de aniversário.', status: 'NEW', tableId: 'mesa-05', momentId: 'a-la-carte', source: 'SITE', history: history('NEW', 'Reserva criada'), createdAt: '2026-09-21T10:24:00-03:00', updatedAt: '2026-09-21T10:24:00-03:00' },
  { id: 'res-0844', code: 'BRU-0844', date: '2026-09-21', time: '13:30', partySize: 6, customerId: 'camila-oliveira', customerName: 'Camila Oliveira', whatsapp: '5545998123456', note: 'Mesa externa, se possível.', status: 'ARRIVED', tableId: 'mesa-14', momentId: 'a-la-carte', source: 'WHATSAPP', history: history('ARRIVED', 'Cliente chegou'), createdAt: '2026-09-20T13:15:00-03:00', updatedAt: '2026-09-21T13:29:00-03:00' },
  { id: 'res-0845', code: 'BRU-0845', date: '2026-09-21', time: '14:00', partySize: 8, customerId: 'grupo-torres', customerName: 'Grupo Torres', whatsapp: '5545998776655', note: 'Evento corporativo.', status: 'CONFIRMED', tableId: 'mesa-18', momentId: 'a-la-carte', source: 'ADMIN', history: history('CONFIRMED', 'Reserva confirmada'), createdAt: '2026-09-19T11:05:00-03:00', updatedAt: '2026-09-19T11:05:00-03:00' },
  { id: 'res-0846', code: 'BRU-0846', date: '2026-09-21', time: '19:30', partySize: 4, customerId: 'lucas-ferreira', customerName: 'Lucas Ferreira', whatsapp: '5545998443322', note: 'Menu degustação.', status: 'COMPLETED', tableId: 'mesa-07', momentId: 'a-la-carte', source: 'SITE', history: history('COMPLETED', 'Reserva finalizada'), createdAt: '2026-09-18T16:08:00-03:00', updatedAt: '2026-09-21T21:30:00-03:00' },
  { id: 'res-0847', code: 'BRU-0847', date: '2026-09-21', time: '20:00', partySize: 2, customerId: 'rafael-mendes', customerName: 'Juliana Martins', whatsapp: '5545998111222', note: '', status: 'NEW', tableId: 'mesa-03', momentId: 'happy-hour', source: 'WHATSAPP', history: history('NEW', 'Reserva criada'), createdAt: '2026-09-21T09:20:00-03:00', updatedAt: '2026-09-21T09:20:00-03:00' },
];

export const team: TeamMember[] = [
  { id: 'rafael', name: 'Rafael Mendes', email: 'rafael.mendes@email.com', role: 'MANAGER', active: true, permissions: ['RESERVATIONS', 'AGENDA', 'CUSTOMERS', 'MENU', 'REPORTS'], lastAccess: 'Hoje, 14:32' },
  { id: 'mariana', name: 'Mariana Costa', email: 'mariana.costa@email.com', role: 'ADMIN', active: true, permissions: ['RESERVATIONS', 'AGENDA', 'CUSTOMERS', 'MENU', 'REPORTS', 'SETTINGS'], lastAccess: 'Hoje, 11:18' },
  { id: 'camila', name: 'Camila Oliveira', email: 'camila.oliveira@email.com', role: 'SERVICE', active: true, permissions: ['RESERVATIONS', 'AGENDA', 'CUSTOMERS'], lastAccess: 'Ontem, 20:15' },
  { id: 'grupo', name: 'Grupo Torres', email: 'grupo.torres@email.com', role: 'CASHIER', active: true, permissions: ['RESERVATIONS', 'AGENDA'], lastAccess: 'Hoje, 13:59' },
  { id: 'lucas', name: 'Lucas Ferreira', email: 'lucas.ferreira@email.com', role: 'SERVICE', active: false, permissions: ['RESERVATIONS', 'AGENDA', 'CUSTOMERS'], lastAccess: 'Nunca acessou' },
];


export const content: SiteContent = {
  heroTitle: 'Gastronomia e bons momentos.',
  heroSubtitle: 'Ingredientes do mundo. Raízes da nossa terra. Uma experiência única em Foz do Iguaçu.',
  heroImageUrl: photos.restaurant,
  chefName: 'Chef Chanwoo Cho',
  chefBio: 'Uma cozinha autoral que une técnica, sensibilidade e respeito aos ingredientes. Um olhar global para a biodiversidade brasileira.',
  chefImageUrl: photos.chef,
  quote: 'Cozinhar é criar conexões entre pessoas, culturas e lugares.',
  gallery: [photos.room, photos.table, photos.restaurant, photos.steak],
};

export const photoUrls = photos;
