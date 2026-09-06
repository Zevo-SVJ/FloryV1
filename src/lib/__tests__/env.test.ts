import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, describe, it } from "node:test";
import { isSupabaseConfigured, requireSupabaseEnv, siteUrl, supabaseEnv } from "@/lib/env";

/**
 * The configuration read, and the one property that makes it correct.
 *
 * This file exists because of a production failure that no amount of setting
 * environment variables could clear: the entry page had been prerendered at
 * build time, on a build that could not see them, and every request afterwards
 * was answered from that HTML file. Two things have to hold for that to be
 * impossible, and both are asserted here.
 */

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const original = { url: process.env[URL_KEY], key: process.env[KEY_KEY] };

const set = (url: string | undefined, key: string | undefined) => {
  if (url === undefined) delete process.env[URL_KEY];
  else process.env[URL_KEY] = url;
  if (key === undefined) delete process.env[KEY_KEY];
  else process.env[KEY_KEY] = key;
};

after(() => set(original.url, original.key));

describe("the Supabase configuration", () => {
  /*
   * The bug this catches: reading `process.env` at module scope. That is
   * evaluated once, when the module first loads, and a platform that withholds
   * a variable from the build and supplies it at runtime is then reported as
   * unconfigured for the life of the process.
   */
  it("is read when it is asked for, not when the module loads", () => {
    set(undefined, undefined);
    assert.equal(supabaseEnv(), null);
    assert.equal(isSupabaseConfigured(), false);

    set("https://project.supabase.co", "anon-key");
    assert.deepEqual(supabaseEnv(), {
      url: "https://project.supabase.co",
      anonKey: "anon-key",
    });
    assert.equal(isSupabaseConfigured(), true);
  });

  it("treats blank and whitespace-only values as absent", () => {
    set("   ", "anon-key");
    assert.equal(isSupabaseConfigured(), false);

    set("https://project.supabase.co", "");
    assert.equal(isSupabaseConfigured(), false);
  });

  it("names every variable that is missing, and no values", () => {
    set(undefined, undefined);
    try {
      requireSupabaseEnv();
      assert.fail("expected requireSupabaseEnv to throw");
    } catch (error) {
      assert.equal((error as Error).name, "MissingEnvError");
      assert.deepEqual((error as { variables: string[] }).variables, [URL_KEY, KEY_KEY]);
    }
  });

  it("trims a trailing slash off the site URL", () => {
    const before = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://lock.example/";
    assert.equal(siteUrl(), "https://lock.example");
    if (before === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = before;
  });
});

describe("the entry page", () => {
  /*
   * Read as source rather than rendered, because what is under test is a
   * build-time decision that no unit test can observe from inside a render.
   *
   * The entry page branches on whether Supabase is configured. If nothing in
   * that branch depends on the request, Next.js prerenders the page and freezes
   * whichever branch the *build machine* saw — which is how "NOT CONFIGURED"
   * survived three redeploys in production. `connection()` is the declaration
   * that this render depends on the request, and it has to come before the read.
   */
  it("declares its request-time dependency before reading configuration", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/page.tsx"),
      "utf8",
    );

    const connection = source.indexOf("await connection()");
    const read = source.indexOf("isSupabaseConfigured()");

    assert.ok(connection !== -1, "src/app/page.tsx must await connection()");
    assert.ok(read !== -1, "src/app/page.tsx must read the configuration");
    assert.ok(
      connection < read,
      "connection() must come before the configuration read, or the page is prerendered",
    );
  });
});
