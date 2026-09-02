"use client";

/**
 * The last resort.
 *
 * Replaces the root layout when the layout itself fails, so it has to render
 * its own `<html>` and cannot rely on the stylesheet having loaded. Hence the
 * inline styles — this is the one file in the project where they are correct.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#ffffff",
          color: "#0d0f14",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 600, margin: 0 }}>
            ShowMe is having a problem
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#4d5461" }}>
            Reload the page. If this keeps happening, it is on our side.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              height: "2.5rem",
              padding: "0 1.25rem",
              borderRadius: "10px",
              border: 0,
              background: "#1f5eff",
              color: "#fff",
              font: "inherit",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#7b8291" }}>
              Reference {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
