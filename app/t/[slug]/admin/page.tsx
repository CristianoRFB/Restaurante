'use client';

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState, type FormEvent } from 'react';
import { firebaseAuth } from '@/lib/firebase-client';
import { listFoodTenantMembers, listFoodTenantMenuItems, removeFoodTenantMenuItem, resolveFoodTenant, revokeFoodTenantMember, saveFoodTenantMenuItem, upsertFoodTenantMember } from '@/lib/food-tenant-repository';
import { parseFoodReaisToCents, type FoodTenantContext, type FoodTenantMembership, type FoodTenantMenuItem } from '@/shared/food-tenant-domain';
import type { TenantRole } from '@/shared/food-platform-domain';

const shell = { margin: '24px auto', maxWidth: 980, padding: '12px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.55 } as const;
const blank = { name: '', description: '', categoryId: '', priceReais: '', active: true };

export default function TenantDemoAdmin({ params }: { params: { slug: string } }) {
  const [ctx, setCtx] = useState<FoodTenantContext | null>(null);
  const [items, setItems] = useState<FoodTenantMenuItem[]>([]);
  const [members, setMembers] = useState<FoodTenantMembership[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [memberUid, setMemberUid] = useState('');
  const [memberRole, setMemberRole] = useState<TenantRole>('SERVICE');

  useEffect(() => {
    if (!firebaseAuth) { setLoading(false); setMessage('Firebase Auth não configurado.'); return; }
    let mounted = true;
    const stop = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!mounted) return;
      setLoading(true); setCtx(null); setItems([]); setMembers([]);
      if (!user) { setMessage('Faça login na plataforma antes de acessar a gestão.'); setLoading(false); return; }
      try {
        const next = await resolveFoodTenant(params.slug);
        const [catalog, staff] = await Promise.all([
          listFoodTenantMenuItems(next),
          next.canManageMembers ? listFoodTenantMembers(next) : Promise.resolve([]),
        ]);
        if (mounted) { setCtx(next); setItems(catalog); setMembers(staff); setMessage(''); }
      } catch (e) {
        if (mounted) setMessage(e instanceof Error ? e.message : 'Acesso recusado.');
      } finally { if (mounted) setLoading(false); }
    });
    return () => { mounted = false; stop(); };
  }, [params.slug]);

  async function act(action: (context: FoodTenantContext) => Promise<void>) {
    if (!ctx || busy) return;
    setBusy(true); setMessage('');
    try {
      // Revalidate membership and suspension at each operation; Rules remain authoritative.
      const current = await resolveFoodTenant(ctx.tenant.id);
      await action(current);
      const [catalog, staff] = await Promise.all([
        listFoodTenantMenuItems(current),
        current.canManageMembers ? listFoodTenantMembers(current) : Promise.resolve([]),
      ]);
      setCtx(current); setItems(catalog); setMembers(staff);
      setMessage('Operação concluída.'); 
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha na operação.'); }
    finally { setBusy(false); }
  }

  function edit(item: FoodTenantMenuItem) {
    setEditing(item.id);
    setForm({ name: item.name, description: item.description, categoryId: item.categoryId, priceReais: (item.priceCents / 100).toFixed(2), active: item.active });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await act(async (current) => {
      await saveFoodTenantMenuItem(current, { name: form.name, description: form.description, categoryId: form.categoryId, priceCents: parseFoodReaisToCents(form.priceReais), active: form.active }, editing ?? undefined);
      setEditing(null); setForm(blank);
    });
  }
  async function addMember(event: FormEvent) {
    event.preventDefault();
    await act(async (current) => {
      await upsertFoodTenantMember(current, memberUid.trim(), memberRole, true);
      setMemberUid('');
    });
  }

  if (loading) return <main style={shell}><h1>Admin do tenant</h1><p role="status">Carregando permissões e dados…</p></main>;
  if (!ctx) return <main style={shell}><h1>Acesso restrito</h1><p role="alert">{message}</p><p><a href={`/t/${encodeURIComponent(params.slug)}/login`}>Entrar ou trocar conta</a></p></main>;

  return <main style={shell}>
    <p><strong>DEMONSTRAÇÃO INTERNA — NÃO É O SISTEMA OFICIAL DE QUALQUER RESTAURANTE.</strong></p>
    <h1>Admin: {ctx.tenant.branding.name}</h1>
    <p>Tenant: <code>{ctx.tenant.id}</code> | Estado: {ctx.tenant.status} | Papel: {ctx.isPlatformOwner ? 'platform_owner' : ctx.membership?.role ?? 'sem papel'}</p>
    <p><a href={`/t/${encodeURIComponent(ctx.tenant.slug)}`}>Prévia do cardápio</a> | <a href="/platform/leads">Leads</a>
      {(ctx.isPlatformOwner || (ctx.membership?.active && ['tenant_owner','ADMIN','MANAGER','CASHIER'].includes(ctx.membership.role))) &&
        <> | <a href={`/t/${encodeURIComponent(ctx.tenant.slug)}/finance`}>Resumo financeiro DEMO</a></>}
    </p>
    {ctx.canManageMembers && <p><a href={`/t/${encodeURIComponent(ctx.tenant.slug)}/branding`}>Editar marca da demonstração</a> (apenas uso privado)</p>}
    <p role="status" aria-live="polite">{message}</p>
    {ctx.tenant.status === 'SUSPENDED' && <p role="alert">Tenant suspenso. Alterações estão indisponíveis.</p>}

    <section><h2>Itens do cardápio ({items.length})</h2>
      {items.length === 0 && <p>Sem itens para este tenant.</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((item) => <article key={item.id} style={{ border: '1px solid #aaa', borderRadius: 8, padding: 12 }}>
          <strong>{item.name}</strong> — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.priceCents / 100)}
          <p>{item.description} | Categoria: {item.categoryId} | {item.active ? 'Ativo' : 'Inativo'}</p>
          {ctx.canManageCatalog && ctx.tenant.status === 'DEMO' && <div>
            <button disabled={busy} onClick={() => edit(item)}>Editar</button>{' '}
            <button disabled={busy} onClick={() => { if (window.confirm('Excluir somente este item do catálogo de demonstração?')) void act((current) => removeFoodTenantMenuItem(current, item.id)); }}>Excluir</button>
          </div>}
        </article>)}
      </div>
    </section>
    {ctx.canManageCatalog && ctx.tenant.status === 'DEMO' &&
      <section><h2>{editing ? 'Editar item' : 'Novo item'}</h2>
        <form onSubmit={save} style={{ display: 'grid', gap: 10, maxWidth: 460 }}>
          <label>Nome <input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label>
          <label>Descrição <textarea maxLength={500} value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></label>
          <label>Categoria <input required maxLength={100} value={form.categoryId} onChange={(e) => setForm((v) => ({ ...v, categoryId: e.target.value }))} /></label>
          <label>Preço em R$ <input required inputMode="decimal" placeholder="29,90" value={form.priceReais} onChange={(e) => setForm((v) => ({ ...v, priceReais: e.target.value }))} /></label>
          <label><input type="checkbox" checked={form.active} onChange={(e) => setForm((v) => ({ ...v, active: e.target.checked }))} /> Disponível</label>
          <div><button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar item'}</button>{' '}
            {editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setForm(blank); }}>Cancelar edição</button>}
          </div>
        </form>
      </section>}
    {ctx.canManageMembers && ctx.tenant.status === 'DEMO' && <section><h2>Equipe</h2>
      {members.length === 0 && <p>Nenhuma membership cadastrada.</p>}
      <ul>{members.map((m) => <li key={m.uid}><code>{m.uid}</code> — {m.role} — {m.active ? 'Ativo' : 'Revogado'}{' '}
        {m.active && (ctx.isPlatformOwner || !['tenant_owner', 'ADMIN'].includes(m.role)) &&
          <button disabled={busy} onClick={() => { if (window.confirm('Revogar o acesso deste usuário ao tenant?')) void act((current) => revokeFoodTenantMember(current, m.uid)); }}>Revogar</button>}</li>)}</ul>
      <form onSubmit={addMember} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label>UID do Firebase Auth <input required minLength={4} maxLength={128} value={memberUid} onChange={(e) => setMemberUid(e.target.value)} /></label>
        <label>Papel <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as TenantRole)}>
          <option value="SERVICE">Atendimento</option><option value="CASHIER">Caixa</option><option value="MANAGER">Gerente</option>
          {ctx.isPlatformOwner && <><option value="ADMIN">Administrador</option><option value="tenant_owner">Dono do tenant</option></>}
        </select></label>
        <button disabled={busy}>Adicionar/atualizar</button>
      </form>
      <p><small>Informar UID da conta Auth existente. Nunca criar usuários ou senhas automáticos.</small></p>
    </section>}
  </main>;
}
