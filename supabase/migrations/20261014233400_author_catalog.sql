-- Catálogo de autores para a arquitetura atual baseada em public.records.
-- Livros antigos mantêm `author`; novos livros gravam authorId/authorIds em data.
CREATE INDEX IF NOT EXISTS records_books_author_id_idx
  ON public.records ((data->>'authorId')) WHERE collection = 'books';
CREATE INDEX IF NOT EXISTS records_books_author_ids_gin_idx
  ON public.records USING gin ((data->'authorIds')) WHERE collection = 'books';
CREATE INDEX IF NOT EXISTS records_authors_name_normalized_idx
  ON public.records ((lower(data->>'name'))) WHERE collection = 'authors';
COMMENT ON INDEX records_books_author_id_idx IS 'Relação compatível com livros legados';
COMMENT ON INDEX records_books_author_ids_gin_idx IS 'Suporta múltiplos autores por livro';
