# Gatinho como ícone do link (favicon)

Usar a imagem do gatinho enviada pelo usuário como o ícone do app (o que aparece na aba do navegador e nos favoritos/atalhos).

## Passos

1. Converter a imagem enviada (`Captura_de_tela_2026-09-06_005825.png`, 229x225) em um ícone quadrado de 64x64 e salvá-lo como `public/favicon.png`, centralizado e sem distorcer.
2. Em `src/routes/__root.tsx`, trocar o link do ícone atual (`/favicon.ico`) por `{ rel: "icon", type: "image/png", href: "/favicon.png" }`.
3. Apagar o `public/favicon.ico` antigo (ícone padrão do Lovable) para não sobrar um ícone desatualizado servido em `/favicon.ico`.

## Resultado

O gatinho aparece como ícone na aba do navegador, nos favoritos e nos atalhos do app, em qualquer computador.
