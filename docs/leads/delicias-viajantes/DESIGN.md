# DESIGN — Delícias Viajantes, edição editorial v2
Data: 2026-11-01 · Tipo: prévia conceitual independente, não oficial.

## Premissas verificadas e limites
Capturas do usuário: marca circular em fundo laranja/terra, categorias de doces e alimentos importados, conteúdo anime/eventos e catálogo oficial solicitado via WhatsApp. Linktree: Central, Franca, ponto Tamura/Santa Fé do Sul e Instagram. O site desta demo não pertence ao estabelecimento.
Suposição comercial: facilitar a vitrine por região e preparar uma seleção antes de atender via WhatsApp. Confirmar cobertura e fluxo de pedidos com a equipe.
Produtos e valores: 100% fictícios. Não declarar disponibilidade ou vendas reais.

## Direção visual
**Acolhedora, exploradora, saborosa.** Referência: linguagem editorial de lojas de confeitaria boutique, sem imitação de identidade alheia.
- Canvas \`#fcf8ef\`; superfície \`#fff\`; chocolate \`#382414\`; texto \`#342316\`; dourado \`#f3b745\`; coral \`#e97454\`; linha \`#e7e0d2\`; sucesso \`#276347\`.
- Headline Fraunces 500–750, fallback Georgia. Interface DM Sans 400–800, fallback Arial. Fontes Google Fonts / SIL OFL, sem distribuir arquivos de fontes.
- Escala de 4–8–12–16–24–32–48–64, raio 10–20 px, sombras discretas; hierarquia de leitura com títulos grandes, espaço e superfícies claras.
- Sem hero com emojis de produtos, sem estatísticas falsas, sem gradiente genérico. Fotografia como âncora visual, texto útil e produto navegável.
- Foto hero: textura real de doces, layout de fotografias sobrepostas, selo editorial. No mobile reduzir altura e exibir produto perto da dobra.

## Imagens e proveniência
Fotos externas licenciadas sob Unsplash License — apenas para **exemplificar textura/categoria**, não fotos do estoque nem da marca. Referências:
- Karsten Winegeart: https://unsplash.com/photos/PL5FZkW0Qkk
- amirali mirhashemian: https://unsplash.com/photos/zNJuvGqup2c
- Emiliano Vittoriosi: https://unsplash.com/photos/ONQ86GlHs3c
- Richard Multimedia: https://unsplash.com/photos/SE-vq-Qp6Uo
- Caroline Badran: https://unsplash.com/photos/7qSmZUpXYwg
- Diego Mejía: https://unsplash.com/photos/8ME2Xniboo8
- David Trinks: https://unsplash.com/photos/D8HnJJwgBt8

A foto nunca serve de afirmação sobre a embalagem vendida. Em versão contratada, substituir por imagens de produto autorizadas.

## Jornada principal
1. Visitante abre catálogo, escolhe região, filtra por categoria ou pesquisa.
2. Seleciona um ou mais exemplos e visualiza sacola com quantidade, preço ilustrativo e resumo.
3. Copia resumo para consulta **manual** nos canais oficiais (sem disparo nem integração).
4. Opcional: cria um pedido fictício na visão Atendimento e avança status.
5. Gestor altera valores e disponibilidade demonstrativos e observa no catálogo.

## Componentes / responsividade
- Bar de contexto (três visões) sempre separada da navegação pública.
- Hero editorial + fotos; bloco de contexto, região, chips com rolagem horizontal, busca e cards com imagem/preço/add.
- Sacola modal com foco, Escape, incrementos e status; badge do carrinho flutuante apenas após adicionar.
- Atendimento e Gestão usam sidebar no desktop e navegação horizontal no mobile; painéis simples, sem gráficos falsos.
- Viewports alvo: 320, 360, 390, 430, 768, 1024, 1440. Estados vazios, elementos tocáveis, foco evidente, reduced-motion.
- Microinterações 150–300ms com propósito (hover produto, feedback sacola). Sem autoplay, sem marionetes de scroll.

## O que não está implementado
Estoque real, API, carrinho transacional, envio WhatsApp, integração de pagamentos, autenticação real, Firestore, backoffice autorizado, dados reais ou sincronização entre dispositivos. \`localStorage\` mantém somente rascunho da demo na mesma origem. \`/health\` é usado apenas na verificação do Worker separado.

## Gates
CI remoto do SHA, checagem do endpoint, abertura das três visões por cliente e prova via navegador quando disponível. Não afirmar teste mobile visual completo sem screenshot ou evidência.
