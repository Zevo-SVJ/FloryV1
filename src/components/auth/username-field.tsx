"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Field, Input } from "@/components/ui/field";
import {
  USERNAME_MAX,
  checkUsername,
  normalizeUsername,
  usernameProblemMessage,
} from "@/lib/validation/username";
import { siteOrigin } from "@/lib/editor/origin";
import { cn } from "@/lib/utils/cn";

/**
 * Choosing a username.
 *
 * Two things happen as somebody types. The preview shows the address they are
 * about to own, because `showme.at/alex` is the product and a field labelled
 * "username" is not. And the name is checked against what is already taken —
 * late, quietly, and never on the keystroke itself.
 *
 * The check is a courtesy, not a guarantee. Whatever it says, the claim is
 * decided by a unique index at the moment of writing; the server actions are
 * written to expect the answer to change underneath them.
 *
 * Only the network answer is state. Length, characters and reserved names are
 * derived during render from what is in the input — they are a pure function
 * of it, and storing them would mean a second render pass to compute something
 * already known.
 */

/** Long enough that a normal typing speed produces one request, not eight. */
const DEBOUNCE_MS = 400;

type RemoteState = "checking" | "available" | "taken" | "reserved" | "unknown";

interface Remote {
  /** The name this answer is about, so a stale reply is never shown. */
  username: string;
  state: RemoteState;
  message: string | null;
}

interface AvailabilityResponse {
  username: string;
  state: "available" | "taken" | "reserved" | "invalid" | "unknown";
  message: string | null;
}

type Status =
  | { state: "empty" | "typing" | "available"; message: null }
  | { state: "checking"; message: null }
  | { state: "taken" | "reserved" | "invalid" | "unknown"; message: string };

export function UsernameField({
  serverError,
  defaultValue = "",
}: {
  /** A message the server sent back after a failed submit. */
  serverError?: string;
  defaultValue?: string;
}) {
  const previewId = useId();
  const [raw, setRaw] = useState(defaultValue);
  const [remote, setRemote] = useState<Remote | null>(null);
  const latest = useRef(0);

  const username = normalizeUsername(raw);
  const localProblem = username.length === 0 ? null : checkUsername(username);
  const askable = username.length > 0 && localProblem === null;

  useEffect(() => {
    if (!askable) return;

    const controller = new AbortController();
    const request = ++latest.current;

    const timer = setTimeout(async () => {
      setRemote({ username, state: "checking", message: null });

      try {
        const response = await fetch(`/api/username?u=${encodeURIComponent(username)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const result = (await response.json()) as AvailabilityResponse;

        // A slower earlier request must not overwrite a newer answer.
        if (request !== latest.current) return;

        setRemote({
          username,
          state: result.state === "invalid" ? "unknown" : result.state,
          message: result.message,
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        if (request !== latest.current) return;
        setRemote({ username, state: "unknown", message: "Could not check that name." });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username, askable]);

  const status = resolveStatus({ username, localProblem, remote, askable });

  // The server's answer outranks anything the field worked out on its own.
  const message = serverError ?? (status.message || undefined);
  const isProblem =
    Boolean(serverError) ||
    status.state === "taken" ||
    status.state === "reserved" ||
    status.state === "invalid";

  return (
    <div className="space-y-2">
      <Field
        label="Username"
        htmlFor="username"
        error={isProblem ? message : undefined}
        hint={
          status.state === "available" ? (
            <span className="text-success">That one is free.</span>
          ) : status.state === "checking" ? (
            "Checking…"
          ) : status.state === "unknown" ? (
            message
          ) : (
            `Letters, numbers, underscores and hyphens. Up to ${USERNAME_MAX} characters.`
          )
        }
      >
        <Input
          id="username"
          name="username"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          maxLength={USERNAME_MAX}
          placeholder="yourname"
          invalid={isProblem}
          aria-describedby={previewId}
        />
      </Field>

      {/*
        * The address, not the field, is what they are choosing — and it is
        * this deployment's address rather than the brand's. Hard-coding
        * `showme.at` here told somebody testing on a preview URL to share a
        * link that was not theirs.
        */}
      <p id={previewId} className="font-mono text-sm text-ink-subtle">
        {`${siteOrigin()}/`}
        <span
          className={cn("transition-colors", askable && !isProblem && "text-ink")}
        >
          {username.length > 0 ? username : "yourname"}
        </span>
      </p>
    </div>
  );
}

function resolveStatus({
  username,
  localProblem,
  remote,
  askable,
}: {
  username: string;
  localProblem: ReturnType<typeof checkUsername>;
  remote: Remote | null;
  askable: boolean;
}): Status {
  if (username.length === 0) return { state: "empty", message: null };

  if (localProblem) {
    return {
      state: localProblem === "reserved" ? "reserved" : "invalid",
      message: usernameProblemMessage(localProblem),
    };
  }

  // An answer about a different name is not an answer about this one.
  if (!askable || remote?.username !== username) return { state: "typing", message: null };

  if (remote.state === "checking") return { state: "checking", message: null };
  if (remote.state === "available") return { state: "available", message: null };

  return {
    state: remote.state,
    message: remote.message ?? "That username is not available.",
  };
}
