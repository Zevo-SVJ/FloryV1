/**
 * The shape a form action hands back.
 *
 * In its own module because a `"use server"` file may only export async
 * functions — a plain object export there is a build error, and a confusing
 * one, since the type-only exports beside it are perfectly legal.
 */

export type AuthField = "email" | "password" | "displayName";

export interface FormState {
  error: string | null;
  fieldErrors?: Partial<Record<AuthField, string>>;
  message?: string | null;
}

export const emptyFormState: FormState = { error: null };
