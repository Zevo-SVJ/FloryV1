import { Wordmark } from "@/components/brand/Brand";

export function Footer() {
  return (
    <footer className="border-t border-edge">
      <div className="gutter flex flex-col gap-8 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-[17rem] text-[0.875rem] leading-relaxed text-ink-3">
            Perception analysis for people who care how they land.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <nav aria-label="Footer" className="flex gap-6 text-[0.875rem]">
            <a href="#questions" className="text-ink-3 transition-colors hover:text-ink">
              Questions
            </a>
            <a href="#top" className="text-ink-3 transition-colors hover:text-ink">
              Back to top
            </a>
          </nav>
          <p className="text-[0.75rem] leading-relaxed text-ink-4 sm:text-right">
            © {new Date().getFullYear()} Blink. Screenshots never leave your device.
            <br />
            An independent product. Not affiliated with or endorsed by Instagram.
          </p>
        </div>
      </div>
    </footer>
  );
}
