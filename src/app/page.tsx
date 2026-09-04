import { ButtonLink } from "@/components/ui/button";
import { LockMark } from "@/components/layout/lock-mark";
import { Label } from "@/components/ui/surface";
import { getUser } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/env";
import { AFTER_SIGN_IN, SIGN_IN_PATH } from "@/lib/auth/routes";
import { PHASES } from "@/lib/lock/phases";

/**
 * The entry page.
 *
 * Not a marketing site. LOCK is private, used by a handful of people who all
 * know what it is, and a landing page written for strangers who will never see
 * it is work that has to be maintained for nobody. This is a door: the name,
 * the shape of the program, and the way in.
 *
 * It does say plainly when the app has no database, because the first person to
 * clone this will hit that, and "nothing happens" is the worst possible answer.
 */
export default async function Home() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getUser() : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-measure flex-col px-6">
      <header className="py-8">
        <LockMark />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-10 pb-24">
        <div className="space-y-5">
          <h1 className="text-display">Build real SaaS products with AI.</h1>
          <p className="text-lede max-w-[38ch] text-ink-muted">
            You are the founder. The tools are the execution layer. LOCK is the
            program that takes you from an idea to a product people pay for.
          </p>
        </div>

        <div>
          <Label className="mb-3">The ten phases</Label>
          <ol className="flex flex-wrap gap-x-2 gap-y-1.5">
            {PHASES.map((phase) => (
              <li
                key={phase.key}
                title={phase.summary}
                className="label rounded-full border border-border px-2.5 py-1 text-ink-muted"
              >
                {phase.label}
              </li>
            ))}
          </ol>
        </div>

        {configured ? (
          <div className="flex flex-wrap gap-3">
            {user ? (
              <ButtonLink href={AFTER_SIGN_IN}>Continue</ButtonLink>
            ) : (
              <>
                <ButtonLink href={SIGN_IN_PATH}>Sign in</ButtonLink>
                <ButtonLink href="/signup" variant="secondary">
                  Create an account
                </ButtonLink>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-card border border-border bg-surface p-5">
            <Label className="text-danger">Not configured</Label>
            <p className="mt-2 text-sm text-ink-muted">
              LOCK has no Supabase project to talk to. Copy{" "}
              <code className="font-mono text-ink">.env.example</code> to{" "}
              <code className="font-mono text-ink">.env.local</code>, fill in the two
              values from your project&rsquo;s API settings, and restart the dev server.
              The steps are in <code className="font-mono text-ink">SETUP.md</code>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
