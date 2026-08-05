export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="edge flex flex-col gap-10 py-14 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[1.0625rem] font-semibold tracking-[-0.03em]">
              Blink
            </span>
            <span
              aria-hidden
              className="mb-[3px] block h-[5px] w-[5px] rounded-full bg-accent"
            />
          </div>
          <p className="mt-4 max-w-xs text-[0.875rem] leading-relaxed text-ink-muted">
            Perception analysis for people who care how they land.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:items-end">
          <nav aria-label="Footer" className="flex gap-7 text-[0.875rem]">
            <a
              href="#analyze"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              Analyze
            </a>
            <a href="#how" className="text-ink-muted transition-colors hover:text-ink">
              How it reads
            </a>
          </nav>
          <p className="text-[0.8125rem] text-ink-faint">
            © {new Date().getFullYear()} Blink. Screenshots never leave your device.
          </p>
        </div>
      </div>
    </footer>
  );
}
