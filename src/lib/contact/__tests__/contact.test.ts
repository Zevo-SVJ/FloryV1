import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contactDetail,
  contactHref,
  contactLabel,
  contactItemSchema,
  telNumber,
  whatsappNumber,
  type ContactItem,
} from "@/lib/contact/actions";

/**
 * The contact block, which is the only place in the product that builds an
 * `href` in a scheme other than http(s).
 *
 * That makes it the one block worth attacking directly. `mailto:` and `tel:`
 * are safe in an href in a way `javascript:` is not — they hand a value to
 * the operating system rather than executing anything — but only if the value
 * is what it claims to be, and only if nothing extra can be smuggled after it.
 * A `mailto:` accepts headers through `?cc=`, and a newline inside one is the
 * classic injection.
 */

const item = (over: Partial<ContactItem> = {}): ContactItem =>
  ({ id: "c1", kind: "email", label: "", value: "hi@example.com", ...over }) as ContactItem;

describe("phone numbers", () => {
  it("keeps the digits and the plus, and throws the decoration away", () => {
    assert.equal(telNumber("+33 6 12 34 56 78"), "+33612345678");
    assert.equal(telNumber("(020) 7946-0958"), "02079460958");
    assert.equal(telNumber("+1.415.555.0132"), "+14155550132");
  });

  it("refuses anything that is not a number", () => {
    for (const value of [
      "",
      "call me",
      "+33 6 12",                       // too few digits
      "+1234567890123456",              // past E.164's fifteen
      "javascript:alert(1)",
      "+33 6 12 34 56 78; DROP TABLE",
      "+33612345678\nBcc: victim@example.com",
    ]) {
      assert.equal(telNumber(value), null, JSON.stringify(value));
    }
  });
});

describe("WhatsApp numbers", () => {
  it("requires a country code, because wa.me resolves without one", () => {
    // The whole reason this is stricter than a phone number: `wa.me/612345678`
    // is a valid URL that reaches somebody else's phone in whichever country
    // WhatsApp guesses.
    assert.equal(whatsappNumber("06 12 34 56 78"), null);
    assert.equal(whatsappNumber("+33 6 12 34 56 78"), "33612345678");
  });

  it("produces digits only — never a URL a creator supplied", () => {
    const href = contactHref(item({ kind: "whatsapp", value: "+33 6 12 34 56 78" }));
    assert.equal(href, "https://wa.me/33612345678");
    assert.match(href ?? "", /^https:\/\/wa\.me\/\d+$/);
  });

  it("refuses an attempt to reach a different host", () => {
    assert.equal(whatsappNumber("+33612345678/../evil.example"), null);
    assert.equal(whatsappNumber("evil.example"), null);
  });
});

describe("the href for each kind", () => {
  it("builds a mailto for a valid address and nothing for an invalid one", () => {
    assert.equal(contactHref(item({ value: "hi@example.com" })), "mailto:hi@example.com");
    assert.equal(contactHref(item({ value: "not an address" })), null);
  });

  it("refuses an address carrying mail headers", () => {
    /*
     * `?subject=` and `?cc=` are refused outright rather than escaped. A
     * contact button has no use for them, and the pattern that rejects them is
     * the same one the `social_links_url_scheme` constraint uses — so the
     * database would refuse the equivalent value too.
     */
    for (const value of [
      "hi@example.com?cc=victim@example.com",
      "hi@example.com&subject=hello",
      "hi@example.com\nBcc: victim@example.com",
      "hi@example.com, other@example.com",
    ]) {
      assert.equal(contactHref(item({ value })), null, value);
      assert.equal(contactItemSchema.safeParse(item({ value })).success, false, value);
    }
  });

  it("builds a tel for a number", () => {
    assert.equal(contactHref(item({ kind: "phone", value: "+33612345678" })), "tel:+33612345678");
  });

  it("gives an address the creator's own link, or none", () => {
    assert.equal(
      contactHref(item({ kind: "address", value: "12 Rue de Rivoli", url: null })),
      null,
    );
    assert.equal(
      contactHref(
        item({ kind: "address", value: "12 Rue de Rivoli", url: "https://maps.example/x" }),
      ),
      "https://maps.example/x",
    );
  });

  it("never emits a dangerous scheme, whatever it is handed", () => {
    // Every kind, attacked with the three schemes that turn an href into
    // script execution. Null is the only acceptable answer.
    for (const kind of ["email", "phone", "whatsapp", "address"] as const) {
      for (const value of [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
      ]) {
        const href = contactHref(item({ kind, value, url: value }) as ContactItem);
        if (href !== null) {
          assert.match(href, /^(mailto:|tel:|https:\/\/)/, `${kind} ${value}`);
        }
      }
    }
  });
});

describe("what the schema accepts", () => {
  it("accepts one valid item of each kind", () => {
    const items: ContactItem[] = [
      item({ kind: "email", value: "hi@example.com" }),
      item({ kind: "phone", value: "+33 6 12 34 56 78" }),
      item({ kind: "whatsapp", value: "+33 6 12 34 56 78" }),
      item({ kind: "address", value: "12 Rue de Rivoli, Paris", url: null }),
    ];

    for (const entry of items) {
      assert.equal(contactItemSchema.safeParse(entry).success, true, entry.kind);
    }
  });

  it("refuses a WhatsApp number with no country code, with a message that says why", () => {
    const parsed = contactItemSchema.safeParse(item({ kind: "whatsapp", value: "0612345678" }));
    assert.equal(parsed.success, false);
    assert.match(parsed.error?.issues[0]?.message ?? "", /country code/i);
  });

  it("refuses an address link that is not a web address", () => {
    const parsed = contactItemSchema.safeParse(
      item({ kind: "address", value: "Somewhere", url: "javascript:alert(1)" }),
    );
    assert.equal(parsed.success, false);
  });

  it("refuses a kind it has never heard of", () => {
    assert.equal(
      contactItemSchema.safeParse({ id: "c1", kind: "fax", label: "", value: "x" }).success,
      false,
    );
  });
});

describe("what the button says", () => {
  it("uses the creator's label when they wrote one", () => {
    assert.equal(contactLabel(item({ label: "  Say hello  " })), "Say hello");
  });

  it("falls back to a name for the kind rather than to the value", () => {
    // "Email", not "hi@example.com" — the address is already on the second
    // line, and a button labelled with an address reads as a mistake.
    assert.equal(contactLabel(item({ label: "" })), "Email");
    assert.equal(contactLabel(item({ kind: "phone", label: "", value: "+33612345678" })), "Call");
  });

  it("shows the detail beneath it", () => {
    assert.equal(contactDetail(item({ value: "hi@example.com" })), "hi@example.com");
  });
});
