# Condado — apresentação independente (não oficial)

Prévia feita especificamente para **Condado — Cafés Especiais & Livros** em Santa Fé do Sul, SP.

- Endereço divulgado: Rua Sete, 715, Loja 8, Centro, Santa Fé do Sul/SP.
- Instagram: https://www.instagram.com/condadolivraria/
- Referências públicas: https://kafex.com.br/blog/cafeteria-condado-santa-fe-do-sul
- Arquivo da prévia: [index.html](./index.html).

## Fluxos prontos na prévia
- Landing page responsiva, experiência da cafeteria e localização.
- Cardápio com produtos e preços **ilustrativos**, filtro, carrinho e comanda.
- Formulário de reserva com horários hipotéticos e bloqueio dos dias divulgados como fechados.
- Painel demonstrativo com pedidos, estados, totalização e reservas.

## Limites explícitos
É uma demonstração front-end estática que usa localStorage do próprio navegador. **Não é um site oficial, cliente contratado, reserva confirmada ou tenant de produção**. Nenhuma reserva/pedido é enviado à cafeteria, nenhum pagamento é realizado e não há autenticação no painel fictício. Use apenas dados inventados.

Fotos externas podem depender de rede e de licenciamento. A foto de referência do espaço é atribuída ao Kafex; exigir autorização de uso antes de qualquer publicação comercial. Confirmar catálogo, preços, horários e regras de mesa com o dono.

## Próxima etapa de integração SaaS
A branch `codex/food-core-leads-demo-foundation` contém o core multi-tenant em evolução. Não misturar dados de prospects com dados de produção. Implementar registro de lead e tenant DEMO isolado, completar APIs/módulos tenant-aware, corrigir CI e executar E2E antes de qualquer deploy. O nome comercial e o branding dependem de autorização para publicação.
