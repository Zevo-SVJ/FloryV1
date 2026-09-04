import "server-only";

/**
 * One import for a role-gated page.
 *
 * `checkAccess` lives in the data access layer, where the session is; the
 * section registry lives beside the navigation, where the labels are. A page
 * needs both and should not have to know that, so they are re-exported together
 * here. Nothing new is defined in this file on purpose — a second place to
 * define access rules is a second place for them to be wrong.
 */
export { checkAccess } from "@/lib/auth/dal";
export { requireSection } from "@/lib/lock/navigation";
