# Direção de arte e UX — GU Doces Gourmet (revisão 02/11/2026)

## Fontes e autorização
- Fonte de negócio: PDF oficial disponibilizado publicamente pela marca, link compartilhado pelo usuário. 54 sabores, quatro categorias, cento, entrada de 50%, seleção de até 4 sabores, antecedência de 3 a 5 dias. Não presumir taxa de entrega, estoques, horários, contato ou valores atuais.
- Identidade observada no Instagram enviado: logotipo circular de GU, preto/creme/ouro, fotos de brigadeiros, comunicação de eventos e encomendas, tipografia promocional. Sem arquivo oficial de marca. Marca textual reinterpretada apenas na prévia não oficial.
- Sites estudados: [Ink](https://www.ink.app.br/) — demonstração da interação e percurso; [Dengo](https://www.dengo.com.br/) — fotografia de produto e calor brasileiro; [Maison Temper (case fictício)](https://sr7webdesign.co.uk/our-work/maison-temper/) — direção editorial/produto; [Compilação Colorlib](https://colorlib.com/wp/chocolate-shop-website-examples/) — impacto visual e fotografia.
- Não copiar layouts, imagens de marcas, depoimentos ou códigos destes sites.

## Diagnóstico da versão anterior
- Hero com círculos CSS representando brigadeiros: imagem artificial/genérica e pouca credibilidade de confeitaria.
- Fundo bege contínuo + blocos rounded indistintos e repetidos; a navegação parecia SPA de protótipo.
- Fluxo principal requeria caçar categoria e resumir pedido sem protagonismo visual; destaque precário das regras de mesclagem.
- Operação/admin sem hierarquia suficiente: mesmo tratamento visual do cliente, e status difíceis de priorizar.
- Texto repetindo "demonstração" em excesso dentro da experiência. Preservar avisos éticos, porém posicioná-los de forma discreta e clara.

## Objetivo
Fazer um prospect reconhecer uma experiência mais fácil de encomenda sem depender de PDF e WhatsApp para selecionar sabores. Três visões, mesma gramática de produto, profissões distintas.

## Personalidade e proposta
**Autoral · elegante · acolhedora.** Matéria-prima: chocolate quase-preto, dourado envelhecido do logotipo, creme de confeitaria e um toque framboesa para seleção.
- Cliente: editorial da marca, fotografia de produto e foco direto em "monte seu cento".
- Produção: interface de balcão, alta densidade legível, fila e status.
- Gestão: interface de escritório, agenda e preços demonstrativos. Sem gráficos fraudulentos.

## Tokens
- background `#F7F5EF`, surface `#FFFFFF`, dark `#181714`, ink `#22201B`, secondary `#68645E`, hairline `#E5E0D8`.
- primary `#2C2924`, gold `#C8A56D`, accent `#A6364B`, success `#286954`, warning `#9A641F`, error `#AE3545`.
- Display: `Cormorant Garamond` (Google Fonts/OFL) ou Georgia; interface: `DM Sans` (OFL) ou system sans.
- Grid 12 col desktop / 1 col mobile; container até 1260px, gutters 20px mobile / 44px desktop.
- Espaçamentos: 4/8/12/16/24/32/48/64/96. Radius moderado: 8px inputs, 10px cartões, botões pílula somente em CTAs.
- Motion 150–210ms (botões, tab ativa, barra de progresso), reduced motion desativa.

## Fotografia
Fotos ilustrativas **não oficiais** licenciadas Unsplash: 
- Rafael Rodrigues: https://unsplash.com/photos/brazilian-brigadeiro-candies-with-chocolate-coconut-and-nuts-0QPhcHWqhPk e https://unsplash.com/photos/brigadeiro-sweets-with-nuts-and-coconut-0I0PcYVEZz8
- Jonathan Borba: https://unsplash.com/photos/sweet-brigadeiros-with-chocolate-and-caramel-sprinkles-in-a-grid-ZHTGsrosCwo
- Nenhuma fotografia é anunciada como produto da GU. Não baixar arte/marca diretamente de redes sociais.

## Fluxo principal (móvel)
1. Primeira dobra mostra chocolate real + CTA "Monte seu cento".
2. Seleção de categoria em abas; sabores como opções acessíveis com estado selecionado, busca e contador 0/4.
3. Resumo sempre explica se preço é calculável ou precisa de confirmação. Quantidade, data e entrega/retirada, observação.
4. Ação cria somente **encomenda de demonstração local**; autoabre fila com novo item; operação avança status e gestão confere agenda.
5. Gestão altera preço local e cliente vê a mudança; só o mesmo dispositivo compartilha estado. Acesso público ao painel é seguro apenas por ser simulado.

## Critérios
- 320/360/390/430/768/1024/1440 px sem overflow horizontal.
- Nenhum botão principal morto; 44px de alvo touch; foco visível, landmarks/labels e mensagens acessíveis.
- Com e sem foto carregada, o layout preserva hierarquia e legibilidade.
- Testes de comportamento no navegador real, e2e de catálogo → fila → gestão; CI aprovado para SHA exato.
- Rota da demo publicada **isoladamente**, produção do Baru e Condado intocadas.

## Escopo e limites
Prévia não oficial; sem autenticação, banco remoto, pedido real, WhatsApp automático, pagamento, garantia de disponibilidade ou alteração no cardápio do prospect. É uma DEMO_INTERATIVA_PERSISTIDA_APENAS_NO_NAVEGADOR, não integração ao SaaS operacional.
