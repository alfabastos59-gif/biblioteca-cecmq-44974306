# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS


## Cadastro e importação de autores

O cadastro de autores está disponível no menu administrativo **Autores**. A tela permite pesquisar sem diferenciar acentos, filtrar por status/nacionalidade, cadastrar/editar/ativar/inativar, consultar o total de livros relacionados e importar CSV.

Para importar novos autores, clique em **Importar CSV**, selecione um arquivo UTF-8 com as colunas `id_autor;nome_autor;nacionalidade;status` e confira o resumo de novos, atualizados, ignorados e erros. A importação é idempotente: repetir o mesmo CSV não cria duplicatas.

Livros antigos continuam exibindo o campo textual `author`; na primeira leitura, o sistema cria/preenche `authorId` e `authorIds` quando encontra correspondência no catálogo. Novos cadastros usam o seletor com sugestões e permitem adicionar mais de um autor.

A migração `supabase/migrations/20261014233400_author_catalog.sql` adiciona índices sobre essas relações no armazenamento `public.records`. Execute as migrações do projeto Supabase antes de publicar a alteração.
