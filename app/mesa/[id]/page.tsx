import { ArrowRight, MapPin, ShoppingBag } from 'lucide-react';
import { LinkButton } from '@/components/baru-ui';
import { PublicLayout } from '@/components/public-shell';
import { sanitizeTableId } from '@/shared/order-domain';

export default function TableAccessPage({ params }: { params: { id: string } }) {
  const tableId = sanitizeTableId(decodeURIComponent(params.id));
  const label = tableId?.replace(/^(?:table|mesa)-/, '').replace(/-[a-z0-9]{8}$/i, '').replace(/-/g, ' ') || '';

  if (!tableId) {
    return <PublicLayout><main className="public-section empty-state"><p className="eyebrow">Acesso inválido</p><h1>Esta mesa não foi identificada.</h1><p>Leia novamente o QR Code disponibilizado pelo Baru.</p><LinkButton href="/cardapio">Abrir cardápio</LinkButton></main></PublicLayout>;
  }

  return <PublicLayout><main className="public-section"><div className="section-heading"><div><p className="eyebrow">Pedido no local</p><h1>Mesa {label}</h1><p>Este acesso identifica a mesa para que você faça o pedido inteiro dentro do site do Baru.</p></div><MapPin size={42} color="var(--terracotta)" aria-hidden="true" /></div><section className="admin-form-card"><div className="form-card"><h2>Mesa identificada</h2><p className="muted">Escolha os produtos, personalize os adicionais e, no checkout, selecione “Consumir no local”. A mesa ficará vinculada automaticamente ao pedido.</p><div className="form-actions"><LinkButton href={`/cardapio?mesa=${encodeURIComponent(tableId)}`}><ShoppingBag size={16} /> Abrir cardápio</LinkButton><LinkButton href="/reservar" variant="ghost">Reservar outra mesa <ArrowRight size={16} /></LinkButton></div></div></section></main></PublicLayout>;
}
