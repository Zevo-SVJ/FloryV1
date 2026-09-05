import type { Metadata } from "next";
import { PageHeader, HeaderMeta } from "@/components/ui/page-header";
import { EmptyState } from "@/components/states/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Card, Label } from "@/components/ui/surface";

export const metadata: Metadata = { title: "My SaaS" };

/**
 * The product workspace.
 *
 * Deliberately written in the second person and about *the product*, not about
 * the course. "Your SaaS has no name yet" is a different sentence from "no
 * records found", and the difference is the whole positioning of LOCK: this is
 * where somebody's company starts, not a module they are working through.
 *
 * The identity block is the part that will hold a name, a one-liner and a
 * status once Prompt 4 gives it somewhere to store them. It is drawn now, empty
 * and honest, so the layout that carries it exists before the data does.
 */
export default function BuildOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="My SaaS"
        title="Your SaaS journey"
        description="Build your product from an idea to something in production that people pay for. Everything you produce along the way lands here."
        meta={
          <>
            <HeaderMeta label="Product">Not named yet</HeaderMeta>
            <HeaderMeta label="Phase">Not started</HeaderMeta>
            <HeaderMeta label="Artifacts">0</HeaderMeta>
          </>
        }
      />

      <section className="space-y-3">
        <Label>Identity</Label>
        <Card className="p-5">
          <EmptyState title="Your product has no name yet" className="border-0 p-0">
            <p>
              The first phases decide what you are building and for whom. When
              they do, the name, the one-line description and the problem it
              solves live here — and every artifact after that hangs off it.
            </p>
          </EmptyState>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3">
          <Label>Artifacts</Label>
          <EmptyState title="Nothing produced yet">
            <p>
              Missions produce real things — a positioning statement, a schema, a
              deployed build. They collect here as evidence the product exists.
            </p>
            <p className="pt-3">
              <ButtonLink href="/build/artifacts" variant="secondary" size="sm">
                Open artifacts
              </ButtonLink>
            </p>
          </EmptyState>
        </section>

        <section className="space-y-3">
          <Label>Build log</Label>
          <EmptyState title="No entries yet">
            <p>
              What you decided, when, and why. You will not remember your own
              reasoning in a month, and the log is how a later decision stays
              consistent with an earlier one.
            </p>
            <p className="pt-3">
              <ButtonLink href="/build/log" variant="secondary" size="sm">
                Open build log
              </ButtonLink>
            </p>
          </EmptyState>
        </section>
      </div>
    </div>
  );
}
