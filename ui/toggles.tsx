"use client";
// Claim (perks) and RSVP (events) buttons. Both need an identity; without one they send you to the sign-in page.
import { useEffect, useState } from "react";
import { requestSignIn } from "@/ui/identity";
import { plural } from "@/lib/format";

async function post(url: string, data: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  return j;
}

export function ClaimButton({ dealId, claimed, count, signedIn }: { dealId: number; claimed: boolean; count: number; signedIn: boolean }) {
  const [state, setState] = useState({ claimed, count });
  useEffect(() => setState({ claimed, count }), [claimed, count]); // fresh props after sign-in
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function claim() {
    if (!signedIn) return requestSignIn();
    setBusy(true); setError("");
    try { const j = await post("/api/claims", { deal_id: dealId }); setState({ claimed: true, count: j.count }); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  return (
    <span className="toggle">
      {state.count > 0 && <span className="tcount">{state.count} claimed</span>}
      {state.claimed ? <span className="tbtn on">Claimed ✓</span>
        : <button type="button" className="tbtn primary" onClick={claim} disabled={busy}>{busy ? "…" : "Claim"}</button>}
      {error && <span className="err small">{error}</span>}
    </span>
  );
}

/** compact: one "Going" toggle (rail); otherwise a Going / Not going pair. */
export function RsvpButton({ eventId, me, count, signedIn, compact }: { eventId: number; me: boolean | null; count: number; signedIn: boolean; compact?: boolean }) {
  const [state, setState] = useState({ me, count });
  useEffect(() => setState({ me, count }), [me, count]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function answer(going: boolean) {
    if (!signedIn) return requestSignIn();
    setBusy(true); setError("");
    try { const j = await post("/api/rsvps", { event_id: eventId, going }); setState({ me: j.me, count: j.going }); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  return (
    <span className="toggle">
      <span className="tcount">{plural(state.count, "going", "going")}</span>
      {compact
        ? <button type="button" className={`tbtn${state.me ? " on" : ""}`} onClick={() => answer(!state.me)} disabled={busy} aria-pressed={!!state.me}>{state.me ? "Going ✓" : "Going"}</button>
        : <>
            <button type="button" className={`tbtn${state.me ? " on" : ""}`} onClick={() => answer(true)} disabled={busy || state.me === true} aria-pressed={state.me === true}>{state.me ? "Going ✓" : "Going"}</button>
            <button type="button" className={`tbtn${state.me === false ? " off" : ""}`} onClick={() => answer(false)} disabled={busy || state.me === false} aria-pressed={state.me === false}>Not going</button>
          </>}
      {error && <span className="err small">{error}</span>}
    </span>
  );
}
