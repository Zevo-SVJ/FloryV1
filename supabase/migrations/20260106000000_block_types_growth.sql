-- ShowMe — three new block types
--
-- Alone in its own migration, for the same reason as
-- `20260103000000_block_types.sql`: `alter type ... add value` is legal inside
-- a transaction on PostgreSQL 12+, but the new label cannot be *used* until
-- that transaction commits, and the Supabase CLI wraps each migration file in
-- one. Splitting the labels from the migration that depends on them means
-- neither has to know how the other is applied.
--
--   heading  A real section heading, with a semantic level. The text block's
--            "heading" style is a paragraph that looks like one; this is an
--            `<h2>` or `<h3>` in the document outline.
--   spacer   Deliberate air between two parts of a page, in three sizes.
--   contact  Email, phone, WhatsApp and an address, as actions rather than
--            links — `mailto:`, `tel:` and a constructed `wa.me` URL.
--
-- `link_grid` is deliberately absent. A grid of link buttons is a *layout* of
-- the links block, not a second kind of link: it renders the same `links`
-- rows, with the same ids, through the same `/go/<id>` redirect, so per-link
-- analytics keeps working and no click is attributed to a duplicate identity.
-- It is a value in the block's own `data`, which needs no enum label.

alter type public.block_type add value if not exists 'heading';
alter type public.block_type add value if not exists 'spacer';
alter type public.block_type add value if not exists 'contact';
