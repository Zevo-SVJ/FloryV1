/**
 * The hairline between the two ways in.
 *
 * A rule with the word set into it, in the monospace at label size. It exists
 * to say the two options are alternatives rather than steps — without it, a
 * Google button stacked above an email field reads as a sequence.
 */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-orientation="horizontal">
      <span className="h-px flex-1 bg-border" />
      <span className="label text-ink-subtle">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
