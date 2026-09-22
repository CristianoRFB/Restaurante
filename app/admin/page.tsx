'use client';

import { ArrowRight, CalendarDays, Clock3, Plus, Star, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '@/components/admin-shell';
import { LinkButton, StatCard, StatusBadge } from '@/components/baru-ui';
import { readReservations, readReservationsAsync, readSettingsAsync } from '@/lib/baru-repository';
import { settings as fallbackSettings } from '@/lib/baru-data';
import { isFirebaseDataMode } from '@/lib/firebase-client';
import { generateTimeSlots, type Reservation, type RestaurantSettings } from '@/shared/baru-domain';

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function AdminDashboardPage() {
  const [items, setItems] = useState<Reservation[]>(() => readReservations());
  const [settings, setSettings] = useState<RestaurantSettings | null>(() => isFirebaseDataMode() ? null : fallbackSettings);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; Promise.all([readReservationsAsync(), readSettingsAsync()]).then(([nextReservations, nextSettings]) => { if (!active) return; setItems(nextReservations); setSettings(nextSettings); }).catch(() => { if (active) setError('Não foi possível sincronizar os dados operacionais.'); }); return () => { active = false; }; }, []);
  const today = useMemo(() => items.filter((reservation) => reservation.date === localDate()).sort((left, right) => left.time.localeCompare(right.time)), [items]);
  const pending = today.filter((reservation) => reservation.status === 'NEW');
  const expectedPeople = today.filter((reservation) => !['CANCELLED', 'NO_SHOW'].includes(reservation.status)).reduce((sum, reservation) => sum + reservation.partySize, 0);
  const next = today.find((reservation) => !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reservation.status));
  const hours = (settings ? generateTimeSlots(settings, localDate()).filter((_, index) => index % 4 === 0) : []).map((time) => time.slice(0, 2));
  const counts = hours.map((hour) => today.filter((reservation) => reservation.time.startsWith(hour)).length);
  const maxCount = Math.max(1, ...counts);
  return <AdminPage title="Operação do dia" subtitle={`${new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}`} actions={<LinkButton href="/admin/reservas/nova"><Plus size={17} /> Nova reserva</LinkButton>}>{error && <p className="field-error" role="status">{error}</p>}<div className="admin-grid"><StatCard icon={<CalendarDays size={20} />} label="Reservas hoje" value={String(today.length)} detail="Dados do repository ativo" /><StatCard icon={<UsersRound size={20} />} label="Pessoas esperadas" value={String(expectedPeople)} detail="Reservas não canceladas" tone="olive" /><StatCard icon={<Clock3 size={20} />} label="Pendentes" value={String(pending.length)} detail="Aguardando confirmação" tone="gold" /><StatCard icon={<Star size={20} />} label="Próxima reserva" value={next?.time || '—'} detail={next ? `${next.customerName} · ${next.partySize} pessoas` : 'Nenhuma reserva pendente'} tone="olive" /></div><div className="admin-two-col"><section className="admin-panel"><header className="admin-panel__header"><h2>Próximas reservas de hoje</h2><a className="panel-link" href="/admin/reservas">Ver todas <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></a></header><div className="admin-panel__body"><div className="data-list">{today.slice(0, 6).map((reservation) => <div className="data-row" key={reservation.id}><strong>{reservation.time}</strong><div><div className="data-row__name">{reservation.customerName}</div><div className="data-row__meta">{reservation.partySize} pessoas · {reservation.tableId?.replace('mesa-', 'Mesa ') || 'Mesa a definir'}</div></div><StatusBadge status={reservation.status} /><a className="panel-link" href={`/admin/reservas/${reservation.id}/editar`} aria-label={`Abrir reserva ${reservation.code}`}><ArrowRight size={16} /></a></div>)}{!today.length && <p className="muted">Nenhuma reserva registrada para hoje.</p>}</div></div></section><section className="admin-panel"><header className="admin-panel__header"><h2>Fluxo do dia</h2></header><div className="admin-panel__body"><div className="bar-chart" aria-label="Gráfico de reservas por horário">{counts.map((count, index) => <span key={hours[index]} style={{ height: `${Math.max(8, count / maxCount * 100)}%` }} />)}</div><div className="bar-chart__labels">{hours.map((hour) => <span key={hour}>{hour}h</span>)}</div><div className="settings-card" style={{ marginTop: 20, padding: 15 }}><strong style={{ fontFamily: 'Georgia, serif' }}>Aguardando confirmação</strong><p style={{ margin: '5px 0 0' }}>{pending.length} {pending.length === 1 ? 'reserva pede' : 'reservas pedem'} atenção da equipe.</p><a className="panel-link" href="/admin/reservas">Ver pendências <ArrowRight size={14} style={{ verticalAlign: 'middle' }} /></a></div></div></section></div><div className="quick-actions"><a className="quick-action" href="/admin/reservas/nova"><CalendarDays size={22} color="var(--terracotta)" /> Nova reserva <ArrowRight size={14} /></a><a className="quick-action" href="/admin/agenda"><Clock3 size={22} color="var(--terracotta)" /> Ver agenda <ArrowRight size={14} /></a><a className="quick-action" href="/admin/cardapio"><Star size={22} color="var(--terracotta)" /> Cardápio <ArrowRight size={14} /></a><a className="quick-action" href="/admin/clientes"><UsersRound size={22} color="var(--terracotta)" /> Clientes <ArrowRight size={14} /></a></div></AdminPage>;
}
