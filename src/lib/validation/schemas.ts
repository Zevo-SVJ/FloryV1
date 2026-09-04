import { z } from "zod";

/**
 * What the forms accept, checked on the server.
 *
 * The browser's validation is a courtesy. These run inside the Server Actions,
 * which are URLs and can be POSTed to directly, so this is the check that
 * counts.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("That does not look like an email address.")
  .transform((value) => value.toLowerCase());

/**
 * Ten characters, and nothing else.
 *
 * No character-class rules: they push people toward `Password1!` and away from
 * length, which is the only property that reliably costs an attacker anything.
 * Supabase enforces its own minimum on top of this, and its answer wins.
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Passwords are limited to 72 characters.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name, or leave the field empty.")
  .max(80, "That name is too long.");

export const signInSchema = z.object({
  email: emailSchema,
  // Deliberately not `passwordSchema`: an existing account may predate the
  // current rule, and refusing to *submit* it would lock somebody out of their
  // own account over a client-side policy.
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema.optional(),
});
