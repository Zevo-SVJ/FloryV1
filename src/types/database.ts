/**
 * The database, in TypeScript.
 *
 * Hand-written rather than generated, and kept that way while the schema is one
 * table: `supabase gen types` needs a running project or the CLI, which is a
 * dependency and a step in front of every clone for something a person can read
 * in thirty seconds. The moment the schema grows past what fits on a screen,
 * switch to generation — the shape below is deliberately the shape the
 * generator emits, so that swap is a file replacement and not a refactor.
 *
 * `Insert` and `Update` are narrower than `Row` on purpose. They describe what
 * may be written, and the database agrees: `role` is absent from both, because
 * no client holds the column privilege to set it. A type that offered that
 * field would be describing a request the server will refuse.
 *
 * `Insert` is typed rather than removed because `postgrest-js` derives the
 * builder's generics from it and collapses the whole table to `never` when it
 * is unusable — which makes `update()` uncallable too. It is unreachable from
 * the application anyway: `profiles` has no insert policy, so the only thing
 * that ever inserts one is the signup trigger, running as the table owner.
 *
 * Everything here is a `type`, never an `interface`, and that is load-bearing
 * rather than a style preference. `postgrest-js` constrains a table to
 * `Record<string, unknown>`; TypeScript gives a type alias an implicit index
 * signature and an interface none, so a `Row` declared as an interface fails
 * the constraint, the whole relation silently degrades to `never`, and
 * `update()` reports that its argument is not assignable to `never` — an error
 * message pointing at the call site rather than at this file.
 */

export type AppRole = "learner" | "mentor" | "admin";

export type Profile = {
  id: string;
  display_name: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: { id: string; display_name?: string | null };
        Update: { display_name?: string | null };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      current_app_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<never, never>;
  };
}
