import { AppNav } from "@/components/layout/app-nav";
import { requireProfile } from "@/lib/auth/dal";

/**
 * The shell every signed-in route sits inside.
 *
 * This is where protection actually happens. The proxy redirects first, which
 * keeps the browser from painting a dashboard it will lose, but a layout that
 * trusted the proxy would be trusting a header — and a Server Action posted
 * directly never passes through one. `requireProfile()` verifies the session
 * against the auth server on every render.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="min-h-dvh">
      <AppNav profile={profile} />
      <main className="container-page py-10">{children}</main>
    </div>
  );
}
