-- ShowMe — one new block type
--
-- Alone in its own migration on purpose. `alter type ... add value` is legal
-- inside a transaction on PostgreSQL 12+, but the new label cannot be *used*
-- until that transaction commits — and the Supabase CLI wraps each migration
-- file in one. Splitting the label from the migration that depends on it means
-- neither has to know how the other is applied.

alter type public.block_type add value if not exists 'image_gallery';
