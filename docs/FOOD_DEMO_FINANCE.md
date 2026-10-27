# Food — resumo financeiro DEMO (sem transações reais)

A rota `/t/[slug]/finance` resume **no máximo 100 pedidos de demonstração** carregados de `tenants/{tenantId}/orders`. Não consulta coleções globais de Baru, banco, caixa, PIX, cartão ou fornecedor de pagamento. Não emite comprovante, recibo ou nota fiscal.

- Resumo inclui total fictício em centavos, pedidos, unidades e média de pedidos.
- O total é rotulado explicitamente como **volume simulado — NÃO receita**.
- Uma amostra de 100 documentos é identificada como limitada; não é estimativa do histórico inteiro.
- A validação do domínio rejeita preço/linha adulterada, outro tenant, duplicatas, registros pagos e totais inconsistentes.
- Listagem de pedidos nas Rules exige Platform Owner ou membership ativo `tenant_owner`, `ADMIN`, `MANAGER` ou `CASHIER`. `SERVICE` não pode listar.
- Continua faltando caixa operacional real, fechamento, estorno, taxas, conciliação, emissão fiscal e homologação de navegador.

A tela e os testes são somente incremento do F3/CORE_FIRST; não ligar faturamento ou global pricing nesta etapa.
