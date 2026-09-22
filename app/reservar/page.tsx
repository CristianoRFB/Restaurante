'use client';

import { ArrowRight, CalendarDays, Clock3, LockKeyhole, MessageCircle, UserRound, Users } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Button, LinkButton } from '@/components/baru-ui';
import { PageHero, PublicLayout } from '@/components/public-shell';
import { createReservationAsync, readContentAsync, readSettingsAsync } from '@/lib/baru-repository';
import { content as fallbackContent, settings as fallbackSettings } from '@/lib/baru-data';
import { isFirebaseDataMode } from '@/lib/firebase-client';
import { dateKeyInTimeZone, generateTimeSlots, normalizeWhatsapp, validateReservation, type RestaurantSettings, type SiteContent } from '@/shared/baru-domain';

export default function ReservePage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(() => isFirebaseDataMode() ? null : fallbackSettings);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(() => isFirebaseDataMode() ? null : fallbackContent);
  const [form, setForm] = useState({ date: dateKeyInTimeZone(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), time: '', partySize: '2', name: '', whatsapp: '', note: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([readSettingsAsync(), readContentAsync()]).then(([nextSettings, nextContent]) => { if (!active) return; setSettings(nextSettings); setSiteContent(nextContent); if (!nextSettings) setError('As reservas online ainda não foram liberadas: as configurações operacionais não estão completas.'); }).catch(() => { if (active) setError('Não foi possível carregar os horários atuais. Tente novamente.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const slots = useMemo(() => settings ? generateTimeSlots(settings, form.date) : [], [settings, form.date]);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const input = { date: form.date, time: form.time, partySize: Number(form.partySize), customerName: form.name, whatsapp: form.whatsapp, note: form.note };
    if (!settings) return;
    const errors = validateReservation(input, settings);
    if (errors.length) { setError(errors[0]); return; }
    setError('');
    setSubmitting(true);
    try {
      const storageKey = 'baru-reservation-idempotency';
      const idempotencyKey = window.sessionStorage.getItem(storageKey) || crypto.randomUUID();
      window.sessionStorage.setItem(storageKey, idempotencyKey);
      const reservation = await createReservationAsync({ date: form.date, time: form.time, partySize: Number(form.partySize), customerId: 'guest', customerName: form.name.trim(), whatsapp: normalizeWhatsapp(form.whatsapp), note: form.note.trim(), status: 'NEW', source: 'SITE', idempotencyKey });
      window.sessionStorage.removeItem(storageKey);
      window.location.href = `/reserva/${reservation.code}`;
    } catch { setError('Não foi possível enviar agora. Tente novamente.'); setSubmitting(false); }
  };

  const minDate = dateKeyInTimeZone(new Date(), settings?.timezone || 'America/Sao_Paulo');
  if (loading) return <PublicLayout><main className="loading-state" style={{ minHeight: '70vh' }}>Carregando horários…</main></PublicLayout>;
  if (!settings) return <PublicLayout><main><PageHero eyebrow="Baru Gastronomia" title="Reservas online indisponíveis." description="A equipe ainda precisa publicar as configurações operacionais antes de receber solicitações pelo site." imageUrl={siteContent?.gallery[0]} /><section className="public-section"><div className="empty-state"><p className="field-error" role="alert">{error || 'Configuração operacional pendente.'}</p><LinkButton href="/cardapio" variant="secondary">Ver cardápio</LinkButton></div></section></main></PublicLayout>;
  return <PublicLayout><main className="reservation-shell"><PageHero eyebrow={settings.city} title="Reservar mesa" description="Boa comida aproxima pessoas. Garanta seu lugar e viva uma experiência única no Baru." imageUrl={siteContent?.gallery[0]} /><section className="public-section"><div className="reservation-card"><form className="reservation-form" onSubmit={submit} noValidate><div><p className="eyebrow">1 · Seus dados</p><h2 className="font-editorial" style={{ margin: '10px 0 0', fontSize: 32 }}>Conte um pouco sobre a sua visita.</h2></div><div className="form-row"><label className="form-label"><span>Data</span><span className="field-shell"><CalendarDays size={17} /><input type="date" value={form.date} min={minDate} onChange={(event) => set('date', event.target.value)} required /></span></label><label className="form-label"><span>Horário</span><span className="field-shell"><Clock3 size={17} /><select value={form.time} onChange={(event) => set('time', event.target.value)} required><option value="">Selecione um horário</option>{slots.map((time) => <option key={time}>{time}</option>)}</select></span></label></div><label className="form-label"><span>Pessoas</span><span className="field-shell"><Users size={17} /><select value={form.partySize} onChange={(event) => set('partySize', event.target.value)}>{Array.from({ length: settings.maxPartySize }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? 'pessoa' : 'pessoas'}</option>)}</select></span></label><label className="form-label"><span>Nome completo</span><span className="field-shell"><UserRound size={17} /><input value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Seu nome completo" required /></span></label><label className="form-label"><span>WhatsApp</span><span className="field-shell"><MessageCircle size={17} /><input value={form.whatsapp} onChange={(event) => set('whatsapp', event.target.value)} placeholder="(45) 9 9988-7766" inputMode="tel" required /></span></label><label className="form-label"><span>Observação <span className="muted">(opcional)</span></span><textarea value={form.note} onChange={(event) => set('note', event.target.value)} maxLength={500} placeholder="Alguma preferência, celebração ou observação?" /><span className="muted" style={{ textAlign: 'right', fontSize: 11 }}>{form.note.length}/500</span></label>{error && <p className="field-error" role="alert">{error}</p>}<Button type="submit" className="button-wide" disabled={submitting}>{submitting ? 'Enviando…' : <>Solicitar reserva <ArrowRight size={16} /></>}</Button><p className="form-note"><LockKeyhole size={14} /> Sua reserva será confirmada pela equipe.</p></form><aside className="reservation-summary">{siteContent?.gallery[1] && <img src={siteContent.gallery[1]} alt="Prato do cardápio Baru" />}<h2>Sua reserva</h2><div className="summary-line"><CalendarDays size={17} /><span>Escolha uma data</span></div><div className="summary-line"><Clock3 size={17} /><span>Escolha um horário</span></div><div className="summary-line"><Users size={17} /><span>{form.partySize} pessoas</span></div><div className="summary-line"><UserRound size={17} /><span>{form.name || 'Seu nome'}</span></div><p className="quote" style={{ color: 'var(--ink)', borderColor: 'var(--terracotta)' }}>“{settings.tagline}”</p></aside></div><div className="whatsapp-card"><div><strong>Prefere falar com a gente?</strong><p>Tire dúvidas ou faça sua reserva pelo WhatsApp.</p></div><LinkButton href={`https://wa.me/${settings.whatsapp}`} variant="secondary"><MessageCircle size={17} /> Chamar no WhatsApp</LinkButton></div></section></main></PublicLayout>;
}
