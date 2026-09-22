'use client';

import { CalendarDays, Clock3, MessageCircle, UserRound, Users, ArrowRight, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CopyButton, LinkButton, StatusBadge, SuccessMark } from '@/components/baru-ui';
import { PublicLayout, PageHero } from '@/components/public-shell';
import { content as fallbackContent } from '@/lib/baru-data';
import { findReservationByCode, readContentAsync } from '@/lib/baru-repository';
import { isFirebaseDataMode } from '@/lib/firebase-client';
import { formatDate, type PublicReservation } from '@/shared/baru-domain';

export default function ReservationConfirmation({ params }: { params: { codigo: string } }) {
  const [reservation, setReservation] = useState<PublicReservation | null>(null);
  const [siteContent, setSiteContent] = useState(() => isFirebaseDataMode() ? null : fallbackContent);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; Promise.all([findReservationByCode(params.codigo), readContentAsync()]).then(([found, content]) => { if (!active) return; setReservation(found); setSiteContent(content); }).catch(() => { if (active) setReservation(null); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [params.codigo]);
  if (loading) return <PublicLayout><main className="loading-state" style={{ minHeight: '70vh' }}>Consultando reserva…</main></PublicLayout>;
  if (!reservation) return <PublicLayout><main><PageHero eyebrow="Baru Gastronomia" title="Reserva não encontrada." description="Confira o código informado ou faça uma nova solicitação." imageUrl={siteContent?.gallery[0]}><LinkButton href="/reservar">Nova reserva <ArrowRight size={16} /></LinkButton></PageHero></main></PublicLayout>;
  return <PublicLayout><main><PageHero eyebrow="Foz do Iguaçu · PR" title="Boa escolha. Em breve nos veremos." description="Sua solicitação de reserva foi enviada. Nossa equipe irá confirmar em breve pelo WhatsApp informado." imageUrl={siteContent?.gallery[0]} /><section className="public-section" style={{ marginTop: -90, position: 'relative', zIndex: 2 }}><div className="confirmation-panel"><div className="confirmation-main"><SuccessMark /><p className="eyebrow" style={{ marginTop: 22 }}>Solicitação enviada</p><h1>Sua reserva foi recebida!</h1><p>Agradecemos seu interesse em viver essa experiência conosco. Nossa equipe está analisando sua solicitação e retornará em breve.</p><div className="code-panel"><div><small>Código da reserva</small><strong>{reservation.code}</strong></div><CopyButton value={reservation.code} /></div><div className="detail-grid"><div className="summary-line"><CalendarDays size={18} /><span><small className="muted">Data</small><br />{formatDate(reservation.date)}</span></div><div className="summary-line"><UserRound size={18} /><span><small className="muted">Nome</small><br />{reservation.customerName}</span></div><div className="summary-line"><Clock3 size={18} /><span><small className="muted">Horário</small><br />{reservation.time}</span></div><div className="summary-line"><MessageCircle size={18} /><span><small className="muted">WhatsApp</small><br />final {reservation.whatsappLast4}</span></div><div className="summary-line"><Users size={18} /><span><small className="muted">Número de pessoas</small><br />{reservation.partySize}</span></div><div className="summary-line"><span><small className="muted">Status</small><br /><StatusBadge status={reservation.status} /></span></div></div><div className="confirmation-actions"><LinkButton href="/reservar" variant="secondary">Nova reserva</LinkButton><LinkButton href="/" variant="ghost"><Home size={15} /> Voltar ao início</LinkButton></div></div>{siteContent?.gallery[1] && <div className="confirmation-image"><img src={siteContent.gallery[1]} alt="Prato do cardápio Baru" /></div>}</div></section></main></PublicLayout>;
}
