# GU Doces Gourmet — prévia conceitual não oficial

**Lead:** GU Doces Gourmet / @gu.doces.gourmet (Santa Fé do Sul/SP, conforme captura enviada).
**Status:** prospect NÃO CONTRATADO. Projeto isolado de demonstração, sem integração com dados ou sistemas da empresa.
**Fonte primária:** PDF compartilhado pelo usuário, https://drive.google.com/file/d/1kS-INNdpZFQLYvxYaFAAQBBMngii_P7R/view (criado em novembro/2025; valores sujeitos à confirmação).

## Preview publicado (ambiente isolado)
- Cliente: https://food-gu-doces-demo.on7.workers.dev/
- Produção: https://food-gu-doces-demo.on7.workers.dev/producao
- Gestão: https://food-gu-doces-demo.on7.workers.dev/gestao

## Direção de arte (refeita em 02/11/2026)
- Ler [DESIGN.md](./DESIGN.md) antes de modificar UI.
- Linguagem editorial de confeitaria: preto/chocolate, creme, ouro envelhecido e framboesa; titulares em Cormorant Garamond e interface DM Sans (OFL).
- Hero com fotografias ilustrativas **licenciadas no Unsplash**, vitrine de categorias clicável, busca de sabores e progresso de seleção 0/4, resumo e estados com feedback.
- Fotografias por Rafael Rodrigues e Jonathan Borba — sem afirmar autoria ou produtos da GU; não utilizadas imagens do Instagram.
- Produção e gestão têm hierarquia e densidade diferentes da vitrine pública; números exclusivamente locais e de teste.

## Proposta
- **Cliente (/):** hero dedicado, catálogo com as quatro categorias e 54 sabores do PDF; seleção de até 4 sabores por cento, formulário para data/quantidade/tipo de recebimento, resumo copiável e criação de encomenda **SIMULADA**.
- **Produção (/producao):** fila demonstrativa, etapas *aguardando sinal → confirmado → em produção → pronto → entregue*, filtros e restauração de exemplos.
- **Gestão (/gestao):** contagens de pedidos **fictícios**, agenda e editor local de preços (reversível).

## Regras comerciais identificadas
| Categoria | Valor no PDF (por cento) |
|--|--:|
| Tradicional | R$145 |
| Gourmet Médio | R$175 |
| Premium | R$195 |
| Luxo | R$250 |

O PDF determina 4 sabores por cento, solicita encomendas com 3–5 dias de antecedência e entrada de 50%. Para mesclagem, cita +R$10 Tradicional/Gourmet, +R$15 Gourmet/Premium, +R$20 Premium/Luxo e +R$25 para 3 ou mais categorias. **Não define o preço-base do cento com categorias misturadas**, nem todas as combinações de duas categorias. Por isso a demo **não inventa total, sinal ou cobrança** nesses casos, marcando 'a confirmar'. Valores e disponibilidade permanecem sujeitos a atualização do estabelecimento.

## Arquitetura e isolamento
- Worker ESM autossuficiente: `worker.mjs` sem APIs ou persistência server-side.
- Dados fictícios compartilhados entre as três visões **somente no mesmo navegador**, via `localStorage` (não sincroniza entre dispositivos e usuários).
- Sem autenticação deliberadamente porque não há banco, backend, admin real, token, API ou dados de clientes; uso operacional exigiria autenticação/tenant/banco e autorização.
- Não envia WhatsApp, não gera pagamento e não coleta dados no servidor. Links para Instagram/Linktree abrem canais existentes para contato humano.
- UI CSS autoral, com imagens ilustrativas sob licença Unsplash e tipografia livre; não foram extraídas imagens/logos do Instagram. Marca textual apenas para contexto, com aviso não oficial visível.
- **Não deve ser deployado no worker do Baru/Condado.** Nome reservado para preview próprio: `food-gu-doces-demo`; confirmar ambiente e URL com Cloudflare antes de compartilhar.

## Executar/testar
```sh
node --check worker.mjs
node --test test.mjs
npx wrangler dev worker.mjs --name food-gu-doces-demo
```
Nenhuma variável de ambiente é requerida. Visualizar `/`, `/producao` e `/gestao`. A CI inclui Chromium E2E para pesquisa de sabores, pedidos, operação, preços, 320/360/390/430/768/1024/1440px e carregamento de fotografias; anexos da Action incluem screenshots reais da página, produção e gestão.

## Pendências antes de virar produto
1. Confirmar identidade, autorizações, preço atual, capacidade/datas e regras exatas de mesclagem.
2. Obter canal oficial de WhatsApp, endereço/modalidades, política de entrega e termos de sinal.
3. Implementar autenticação, controle de acesso, isolamento multi-tenant, armazenamento, consentimento/LGPD, retenção, segurança, observabilidade e testes E2E.
4. Validar manualmente em aparelhos físicos e revisar fotografias com o proprietário antes de produção. Nunca usar os dados da demo como pedido real.

**Roteiro comercial:** mostrar seleção de 4 sabores → simular pedido → abrir fila de produção → avançar pedido → abrir gestão e editar preços localmente.