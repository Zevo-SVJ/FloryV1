import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-dvh flex-col items-center justify-center py-16 text-center">
      <h1 className="text-title">Page not found</h1>
      <p className="mt-3 max-w-sm text-[0.9375rem] text-ink-muted">
        The address you followed does not lead anywhere.
      </p>
      <div className="mt-8">
        <ButtonLink href="/" size="sm" variant="secondary">
          ShowMe home
        </ButtonLink>
      </div>
    </main>
  );
}
