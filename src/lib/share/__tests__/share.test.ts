import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SHARE_TARGETS, shareActions, shareLabel, shareMessage } from "@/lib/share/targets";

/**
 * The share sheet's platform list.
 *
 * Two things are worth asserting about it. Every target either has a real
 * intent URL or admits it has none — the failure mode this guards against is
 * an Instagram button that opens a broken composer, which is worse than a
 * button that copies the link and says where to paste it.
 *
 * And every substituted value is encoded. The address is our own canonical
 * URL, but the creator's display name is not: it goes into a `mailto:`
 * subject, where an unescaped line break is the classic header injection.
 */

const URL = "https://showme.at/8zevo";

describe("share targets", () => {
  it("offers the platforms a creator actually uses", () => {
    assert.deepEqual(
      [...SHARE_TARGETS],
      ["x", "whatsapp", "telegram", "email", "instagram", "tiktok"],
    );
  });

  it("gives every target a label", () => {
    for (const target of SHARE_TARGETS) {
      assert.ok(shareLabel(target).length > 0, target);
    }
  });

  it("either has an intent or says it has none — never a broken one", () => {
    for (const action of shareActions(URL, "Zevo")) {
      const hasIntent = action.href !== null;
      const hasHint = action.copyHint !== null;

      assert.equal(hasIntent, !hasHint, `${action.target} must be one or the other`);
      if (hasIntent) {
        assert.match(action.href ?? "", /^(https:\/\/|mailto:)/, action.target);
      }
    }
  });

  it("puts Instagram and TikTok in the copy-link group, because that is what they are", () => {
    const byTarget = new Map(shareActions(URL, "Zevo").map((a) => [a.target, a]));

    for (const target of ["instagram", "tiktok"] as const) {
      assert.equal(byTarget.get(target)?.href, null);
      assert.match(byTarget.get(target)?.copyHint ?? "", /paste/i);
    }
  });

  it("carries the page address in every intent", () => {
    for (const action of shareActions(URL, "Zevo")) {
      if (!action.href) continue;
      assert.ok(
        action.href.includes(encodeURIComponent(URL)),
        `${action.target} does not carry the address`,
      );
    }
  });
});

describe("what travels with the link", () => {
  it("is the creator's own name, not our marketing", () => {
    // A creator sharing their page is sharing their work. "Check out my
    // ShowMe!" is a sentence they did not write.
    assert.equal(shareMessage("Zevo"), "Zevo");
    assert.equal(shareMessage("Zevo").includes("ShowMe"), false);
  });

  it("has something to say for a creator with no display name", () => {
    assert.equal(shareMessage(""), "My links");
    assert.equal(shareMessage("   "), "My links");
  });

  it("strips control characters before they reach a URL", () => {
    /*
     * The mail-header injection, closed twice: the control characters are
     * removed here, and everything is percent-encoded after that. Relying on
     * encoding alone would mean trusting every mail client to agree about
     * what `%0A` means in a subject.
     */
    const hostile = "Zevo\r\nBcc: victim@example.com";
    assert.equal(shareMessage(hostile), "Zevo Bcc: victim@example.com");

    const email = shareActions(URL, hostile).find((a) => a.target === "email");
    assert.ok(email?.href);
    assert.equal(/[\r\n]/.test(email.href), false);
    assert.equal(email.href.includes("Bcc:"), false, "the colon and space are encoded");
  });

  it("cannot introduce a parameter of its own into an intent", () => {
    /*
     * The property that matters is not that the text disappears — the letters
     * of `utm_source` survive percent-encoding, because letters are
     * unreserved. It is that the *separators* do not: a raw `&` or `=` from a
     * display name would add a parameter to somebody else's composer, and a
     * raw `#` would truncate the URL at a fragment.
     *
     * So the check is structural. Split the query on `&` and every part has to
     * be one of the parameters this file wrote.
     */
    const hostile = 'Zevo&utm_source=x&url=https://evil.example#frag "q" <tag>';
    const ours = new Set(["url", "text", "subject", "body"]);

    for (const action of shareActions(URL, hostile)) {
      if (!action.href) continue;

      const [base, query = ""] = action.href.split("?");
      assert.equal(base?.includes("#"), false, `${action.target} base`);

      const names = query.split("&").map((part) => part.split("=")[0]);
      for (const name of names) {
        assert.ok(ours.has(name ?? ""), `${action.target} gained a parameter: ${name}`);
      }

      // Exactly one `url` parameter where there is one at all, so a hostile
      // name cannot append a second for a client to prefer.
      assert.ok(
        names.filter((name) => name === "url").length <= 1,
        `${action.target} has two url parameters`,
      );

      // And nothing that would break out of an attribute if the href were
      // ever interpolated into markup rather than set as a property.
      assert.equal(/["'<>]/.test(action.href), false, action.target);
    }
  });

  it("caps a pathological name rather than building a URL nothing will accept", () => {
    assert.ok(shareMessage("x".repeat(500)).length <= 120);
  });
});
