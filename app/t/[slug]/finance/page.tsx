'use client';

import { useParams } from 'next/navigation';

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { firebaseAuth } from '@/lib/firebase-client';
import { resolveFoodTenant } from '@/lib/food-tenant-repository';
import { readFoodDemoFinance } from '@/lib/food-demo-finance-repository';
import type { FoodDemoFinanceSummary } from '@/shared/food-demo-finance';
import type { FoodDemoOrder } from '@/shared/food-demo-order';

const money = (cents: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);

export default function DemoFinancePage() {
  const slug = useParams<{ slug: string }>().slug;
  const [summary,setSummary] = useState<FoodDemoFinanceSummary|null>(null);
  const [orders,setOrders] = useState<FoodDemoOrder[]>([]);
  const [status,setStatus] = useState('Validando acesso…');
  useEffect(()=>{
    if(!firebaseAuth){setStatus('Firebase indisponível.');return;}
    let live=true;
    const stop=onAuthStateChanged(firebaseAuth,async user=>{
      if(!live)return;
      setSummary(null);setOrders([]);
      if(!user){setStatus('Entre com conta de caixa ou gerência.');return;}
      try {
        const context=await resolveFoodTenant(slug);
        const data=await readFoodDemoFinance(context);
        if(live){setSummary(data.summary);setOrders(data.orders);setStatus('');}
      } catch {
        if(live)setStatus('Sem acesso à visão financeira desta demonstração.');
      }
    });
    return()=>{live=false;stop();};
  },[slug]);
  const container={fontFamily:'system-ui,sans-serif',maxWidth:900,margin:'2rem auto',padding:24,lineHeight:1.5} as const;
  return <main style={container}>
    <strong>DEMONSTRAÇÃO PRIVADA — NÃO É CONTABILIDADE, RECEITA NEM CAIXA REAL</strong>
    <h1>Resumo de pedidos simulados</h1>
    <p><a href={'/t/'+encodeURIComponent(slug)+'/admin'}>Voltar ao painel</a></p>
    {!summary ? <p role="status">{status}</p> : <>
      <section><h2>Volume simulado (amostra de até 100 pedidos)</h2>
        <p><strong>{money(summary.simulatedGrossCents)}</strong> — soma fictícia, não receita recebida</p>
        <p>{summary.orderCount} pedidos simulados | {summary.itemCount} itens | valor médio simulado: {money(summary.averageOrderCents)}</p>
        {summary.sampleLimited&&<p role="alert">Amostra limitada a 100 documentos; não representa total histórico.</p>}
      </section>
      <section><h2>Últimos registros carregados (até 20)</h2>
        {orders.length===0&&<p>Nenhum pedido demonstrativo.</p>}
        <ul>{orders.map(o=><li key={o.id}><code>{o.id}</code> — {money(o.subtotalCents)} — {o.status}</li>)}</ul>
      </section>
      <p>Sem pagamentos, estorno, fechamento de caixa, taxa, nota fiscal ou movimentação bancária. Pedidos reais do Baru permanecem fora desta página.</p>
    </>}
  </main>;
}
