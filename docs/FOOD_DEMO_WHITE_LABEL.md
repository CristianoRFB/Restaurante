# White-label privado por tenant — Food DEMO

A identidade visual de uma demonstração fica armazenada em `tenants/{tenantId}.branding`. O editor está disponível em `/t/[slug]/branding` para Platform Owner e `tenant_owner` com tenant DEMO ativo.

## Campos

- `name`: texto de 3 a 120 caracteres.
- `tagline`: texto até 240 caracteres.
- `primaryColor`, `backgroundColor`, `accentColor`: cores HEX de seis dígitos, sem CSS arbitrário, URL ou HTML.
- `fontPreset`: `system`, `serif` ou `rounded`, sem carregamento de fontes externas.

Propriedades opcionais permanecem compatíveis com tenants criados antes desta versão. Novos tenants recebem valores fictícios e neutros, sem marca oficial de prospect.

## Proteções e comportamento

- Firestore Rules validam o documento inteiro. Ao `tenant_owner` são permitidas **apenas alterações em `branding` e `updatedAt`**; `planId`, `subscriptionStatus`, `status`, `linkedLeadId`, `publiclyListed`, `slug` e `kind` continuam imutáveis para ele.
- Manager, Cashier e Service não alteram branding; um dono de A não edita B.
- Branding só é editado por dono de tenant ativo; Platform Owner conserva governança.
- A prévia `/t/[slug]` lê os valores salvos do tenant atual. O editor inclui prévia local sem publicação e sem anexar logotipos/imagens.
- Ainda faltam: white-label completo nos módulos legados, esquema de domínio personalizado, cobertura de contraste/acessibilidade automatizada, upload de assets com autorização e homologação mobile.

O projeto **não presume autorização do Baru para uso público da marca** e não deve exibir logotipo/contatos reais sem direitos comprovados.

## Testes

`tests/food-demo-branding.test.ts` cobre entradas maliciosas, cores e defaults. `tests/food-platform.rules.test.ts` cobre edição owner-only, negativas A×B, escalonamento de privilégios e alterações de status/plano/publicação. CI aprovado no commit de Rules correspondente.
