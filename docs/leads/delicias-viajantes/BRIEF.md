# Delícias Viajantes — brief e qualificação
Data: 2026-11-01 (Brasil). Lead ID: `lead-delicias-viajantes-instagram`.
Status: **DEMO_EM_PRODUCAO / AINDA NÃO CONTATADO**. Prioridade: ALTA.
Nicho: catálogo e comércio regional de doces e alimentos importados; eventos anime/cultura pop.

## Fontes verificadas
- Instagram informado pelo usuário: https://www.instagram.com/delicias.viajantes/
- Linktree aberto e verificado: https://linktr.ee/delicias.viajantes
- Capturas do Instagram enviadas em 2026-11-01: bio e posts do AnimeFest, anúncios regionais publicados em agosto (não tratar taxas, mínimos e datas desses anúncios como condições atuais).
- Linktree lista WhatsApp Central e Franca, referência ao Tamura Supermercado em Santa Fé do Sul e Instagram. Não apresenta catálogo público navegável nesse canal.
- Bio do print informa atuação desde 2018, vendas de alimentos importados, catálogo somente via WhatsApp, atualizações frequentes; público de 38,3 mil seguidores **na captura**, não em métrica autenticada.
- Links públicos de contato no Linktree: Central https://wa.me/5516991379597 e Franca https://wa.me/5516982137668. Não usar para disparos automáticos; Santa Fé do Sul é loja parceira, não confirmar delivery próprio.

## Evidência e hipóteses
CONFIRMADO NA CAPTURA: marca, conta, modelo de catálogo por WhatsApp, posts de AnimeFest e vários anúncios por cidade.
CONFIRMADO NO LINKTREE: WhatsApps separados, supermercado Tamura como ponto físico em Santa Fé do Sul, Instagram.
HIPÓTESE: cliente enfrenta repetição de envio de catálogo, risco de pedidos incompletos, divergência de disponibilidade regional; confirmar com gestor.
DESCONHECIDO: domínio próprio, sistema interno, preços atuais, estoques, coberturas, custos, calendário, margens, responsável pelo comercial, possibilidade de importação de produtos.

## Proposta
Não criar um e-commerce com checkout real antes de validar processo. Mostrar catálogo mobile, escolha de região, carrinho, geração de resumo de pedido para WhatsApp, fila do atendente, catálogo e disponibilidade em painel de demonstração.
Três vistas disponíveis sob o mesmo Worker de preview, sem autenticação porque **não existem dados sensíveis ou qualquer backend real**.
- Cliente: `/#/cliente`
- Atendimento: `/#/atendimento`
- Gestão: `/#/gestao`

## Escopo factual
Todas as seis fichas de produto, preços, banners, disponibilidade e pedidos de teste são ilustrativos e nunca devem ser apresentados como oferta da Delícias Viajantes.
As mensagens são apenas para copiar. A demo NÃO envia nada ao WhatsApp, NÃO acessa o sistema da empresa e NÃO cobra.
LocalStorage preserva os dados apenas no mesmo navegador/origem: não é sincronização real de dispositivos.
A prévia é não oficial, independente da empresa, sem contrato confirmado.

## Próximos passos comerciais
1. Enviar abordagem respeitosa ao Instagram somente com autorização do usuário.
2. Demonstrar catálogo → carrinho → pedido interno → gestão em 90 segundos.
3. Confirmar se equipe deseja catálogo próprio e se a divisão Central/Franca/supermercado é adequada.
4. Receber fotos, produtos, preços, cobertura, regras de entrega, autorização de marca e escolha de integração antes de sistema real.
5. Consultar preços vigentes da vertical antes de proposta monetária formal.
