# Testes

Os testes de domínio cobrem validação de data, horário, lotação, WhatsApp, observação e consistência dos seeds. O teste de Rules cobre criação pública, leitura/alteração de equipe e exclusão administrativa.

```bash
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build
```

O teste manual recomendado percorre home → cardápio → reserva → confirmação e login demo → dashboard → reservas → edição. Repetir em viewport móvel, teclado, zoom de 200%, formulário inválido e recarga durante a submissão.
