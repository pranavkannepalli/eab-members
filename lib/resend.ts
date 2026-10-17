// Resend HTTP API, no SDK. Kept free of app imports so the chunking can be tested on its own (scripts/test-resend.mts).
// Each recipient gets their own email (nobody sees the list); emails go out through POST /emails/batch,
// which accepts at most RESEND_BATCH_MAX emails per call, so recipients are sent in chunks of that size.
export const RESEND_BATCH_MAX = 100;
export const DEFAULT_FROM = "E@B Members <onboarding@resend.dev>"; // Resend's test sender; set RESEND_FROM once the domain is verified

export const resendConfigured = () => !!process.env.RESEND_API_KEY;
export const resendFrom = () => process.env.RESEND_FROM || DEFAULT_FROM;

export function chunk<T>(items: T[], size = RESEND_BATCH_MAX): T[][] {
  if (!(size >= 1)) throw new Error("chunk size must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type Message = { subject: string; text: string };
export type Result = { to: string; ok: boolean; id?: string; error?: string };

type Opts = { apiKey: string; from: string; fetch?: typeof fetch; pauseMs?: number; size?: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Send `msg` to every address, one email each, in batch calls of at most `size`. A failed call fails only its chunk. */
export async function sendEach(to: string[], msg: Message, o: Opts): Promise<Result[]> {
  const f = o.fetch ?? fetch, pause = o.pauseMs ?? 600; // default Resend rate limit is a few requests per second
  const results: Result[] = [];
  const chunks = chunk(to, o.size ?? RESEND_BATCH_MAX);
  for (const [i, group] of chunks.entries()) {
    if (i > 0 && pause) await sleep(pause);
    const payload = group.map((addr) => ({ from: o.from, to: [addr], subject: msg.subject, text: msg.text }));
    let error = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await f("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: { authorization: `Bearer ${o.apiKey}`, "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j: any = await r.json().catch(() => ({}));
        if (r.status === 429 && attempt < 2) { await sleep(1000 * (attempt + 1)); continue; }
        if (!r.ok) { error = `Resend ${r.status}: ${j?.message || j?.name || "request failed"}`; break; }
        const ids: { id?: string }[] = Array.isArray(j?.data) ? j.data : [];
        group.forEach((addr, k) => results.push({ to: addr, ok: true, id: ids[k]?.id }));
        error = "";
        break;
      } catch (e) {
        error = `Network error: ${(e as Error).message}`;
        break;
      }
    }
    if (error) group.forEach((addr) => results.push({ to: addr, ok: false, error }));
  }
  return results;
}
