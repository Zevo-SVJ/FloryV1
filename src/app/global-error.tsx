"use client";

import { useEffect } from "react";

/**
 * The last boundary: an error thrown by the root layout itself.
 *
 * It replaces the whole document, so it must render its own `<html>` and
 * `<body>` — and it cannot rely on the stylesheet, the fonts or any component
 * of ours, because the layout that loads them is the thing that failed. Hence
 * inline styles and no imports. This should never be seen.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#0c0c0b",
          color: "#f4f4f0",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ letterSpacing: "0.22em", fontWeight: 600 }}>LOCK</p>
          <p style={{ color: "#a8a89d" }}>
            LOCK could not start. Reload the page, or check the server log.
          </p>
          {error.digest ? (
            <p style={{ color: "#7a7a71", fontSize: "0.75rem" }}>
              Reference {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
