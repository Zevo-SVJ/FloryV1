-- Read a display name from an OAuth provider too
--
-- `handle_new_user()` looked for one key, `display_name`, which is what LOCK's
-- own signup form sends. Google sends none of that: it populates
-- `raw_user_meta_data` with `full_name` and `name` (and `email`, `picture`,
-- `avatar_url`, `sub`). So an account created with "Continue with Google"
-- arrived with a null display name and the interface addressed it as "Your
-- account" — correct, and worse than the name Google had already handed us.
--
-- Only the name changes. `role` is still never read from that field, for the
-- reason the original migration gives at length: `raw_user_meta_data` is
-- `options.data` from the browser on a password signup, and an OAuth provider's
-- claims on a social one. Neither is a source of authorization. The column
-- default decides, and the default is `learner`.
--
-- `create or replace` on the function alone: the trigger already points at it
-- and does not need to be recreated, which keeps this migration re-runnable.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  /*
   * In preference order, and every one of them a label rather than a
   * permission:
   *
   *   display_name — LOCK's own signup form
   *   full_name    — Google, GitHub, most OIDC providers
   *   name         — the OIDC standard claim, and the fallback for the rest
   *
   * `nullif(btrim(...), '')` on each, so a provider sending an empty string
   * falls through to the next rather than winning with nothing.
   */
  candidate := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
  );

  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(left(coalesce(candidate, ''), 80)), ''))
  on conflict (id) do nothing;

  return new;
end;
$$;
