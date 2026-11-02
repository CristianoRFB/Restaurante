# DESIGN — Delícias Viajantes (prévia conceitual)

## Contexto
A arte laranja/terra e a marca circular aparecem na captura fornecida; **não** foram reproduzidos os arquivos originais ou fotografias da loja. Este é um redesign especulativo sem endosso.
Personalidade: **acolhedora, exploradora, pop**. Público: consumidor de doces importados, seguidores de Instagram, visitantes de eventos e compradores de cidades da região.

## Objetivo e jornada
Principal: encontrar um produto → adicionar à sacola → visualizar um resumo útil. Diferencial: respeitar unidade local e não forçar um checkout real que o estabelecimento não confirmou.
Secundária: equipe demonstra recebimento em fila; gestor edita catálogo/estoque, sem dados reais.

## Direção de arte
Chocolate profundo `#321707`, laranja `#ffaf3d`, creme `#fffaf0`, texto `#3d2418`, borda `#eadfcd`. Contraste e hierarquia testáveis.
Tipografias do Google Fonts: DM Sans (interface) e Fraunces (editorial) com fallback Arial/Georgia; sem copiar fontes privadas.
Componentes: navegação clara em 3 visões, hero ilustrado com embalagens abstratas em CSS/emoji, chips de categoria, busca, card com CTA, drawer da sacola, ações de equipe e inputs no editor.
Mobile: 320–430 px, cards em 2 colunas, CTA com área de toque 44px, hero compacto. Desktop: grade em três colunas, painel com listagem.
Motion de 200ms apenas no hover; `prefers-reduced-motion` remove transições.

## Evidência e mídia
Não incluir logos originais, fotos de produtos de terceiros ou marcas de doces sem direitos. Produtos inventados foram rotulados no topo e no rodapé. A empresa deve aprovar logo, imagens e conteúdo antes da comercialização.

## Segurança e implantação
DEMO_INTERATIVA_EFEMERA com estado localStorage; sem servidor de pedidos, backend, auth, pagamentos, WhatsApp ou API de estoque. Admin não é um console real protegido e não deve ser anunciado como tal.
Todos os recursos de marca, preço, entrega, catálogo e campanhas regionais exigem aprovação.

## Critérios de aceite
1. Abrir preview sob domínio separado, sem mexer em Baru/prod.
2. Ver seis produtos, buscar e filtrar; abrir sacola e gerar resumo.
3. Simular pedido e avançar etapas; alterar preço/estoque na gestão e ver refletido no catálogo.
4. Confirmação de DEMO não oficial e preços ilustrativos em qualquer visão.
5. Teste de CI, inspeção do URL publicado e verificação do comportamento mobile quando navegador E2E estiver disponível.
